import { createHash } from "node:crypto";
import { AppError } from "../../lib/AppError.js";
import { recordAudit } from "../../lib/audit.js";
import { prisma } from "../../lib/prisma.js";
import { generateTermPdf } from "../../lib/term.js";

interface CreateAssignmentInput {
  equipmentId: string;
  receiverId: string;
  notes?: string;
  signatureDataUrl?: string; // assinatura capturada no frontend (base64)
}

export const assignmentService = {
  // Lista atribuições, mais recentes primeiro.
  async list() {
    return prisma.assignment.findMany({
      orderBy: { assignedAt: "desc" },
      include: {
        equipment: { select: { id: true, name: true, serialNumber: true } },
        receiver: { select: { id: true, name: true } },
      },
    });
  },

  // Registra a ENTREGA de um equipamento a um colaborador.
  async create(
    { equipmentId, receiverId, notes, signatureDataUrl }: CreateAssignmentInput,
    createdById: string
  ) {
    // 1. Validações de negócio antes de tocar no banco.
    const equipment = await prisma.equipment.findUnique({
      where: { id: equipmentId },
    });
    if (!equipment) {
      throw new AppError("Equipamento não encontrado", 404);
    }
    if (equipment.status !== "AVAILABLE") {
      throw new AppError("Equipamento não está disponível para entrega");
    }

    const receiver = await prisma.user.findUnique({ where: { id: receiverId } });
    if (!receiver) {
      throw new AppError("Colaborador não encontrado", 404);
    }

    // 2. As duas escritas precisam ser atômicas: ou as duas acontecem, ou
    //    nenhuma. $transaction garante isso (se a 2ª falhar, a 1ª é desfeita).
    const assignment = await prisma.$transaction(async (tx) => {
      const created = await tx.assignment.create({
        data: { equipmentId, receiverId, createdById, notes, status: "ACTIVE" },
      });
      await tx.equipment.update({
        where: { id: equipmentId },
        data: { status: "ASSIGNED" },
      });
      return created;
    });

    // 3. Hash de integridade da assinatura (se houver): SHA-256 sobre a
    //    assinatura + id + data. Qualquer alteração futura muda o hash.
    let signatureHash: string | undefined;
    if (signatureDataUrl) {
      signatureHash = createHash("sha256")
        .update(
          `${signatureDataUrl}|${assignment.id}|${assignment.assignedAt.toISOString()}`
        )
        .digest("hex");
    }

    // 4. Gera o PDF do termo (efeito colateral fora da transação) e grava o
    //    caminho + o hash na atribuição.
    const termPdfPath = await generateTermPdf({
      assignmentId: assignment.id,
      equipmentName: equipment.name,
      equipmentType: equipment.type,
      equipmentSerial: equipment.serialNumber,
      receiverName: receiver.name,
      assignedAt: assignment.assignedAt,
      signatureHash,
      signatureDataUrl,
    });

    const updated = await prisma.assignment.update({
      where: { id: assignment.id },
      data: { termPdfPath, signatureHash },
    });

    await recordAudit({
      action: "ASSIGNMENT_CREATED",
      entity: "Assignment",
      entityId: assignment.id,
      performedById: createdById,
      metadata: { equipmentId, receiverId },
    });
    return updated;
  },

  // Registra a DEVOLUÇÃO: encerra a atribuição e libera o equipamento.
  async returnEquipment(assignmentId: string, performedById: string) {
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
    });
    if (!assignment) {
      throw new AppError("Atribuição não encontrada", 404);
    }
    if (assignment.status === "RETURNED") {
      throw new AppError("Esta atribuição já foi devolvida");
    }

    // Mesma lógica de atomicidade da entrega, no sentido inverso.
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.assignment.update({
        where: { id: assignmentId },
        data: { status: "RETURNED", returnedAt: new Date() },
      });
      await tx.equipment.update({
        where: { id: assignment.equipmentId },
        data: { status: "AVAILABLE" },
      });
      return result;
    });

    await recordAudit({
      action: "ASSIGNMENT_RETURNED",
      entity: "Assignment",
      entityId: assignmentId,
      performedById,
    });
    return updated;
  },

  // Devolve o caminho do PDF do termo de uma atribuição (para download).
  async getTermPath(assignmentId: string) {
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
    });
    if (!assignment || !assignment.termPdfPath) {
      throw new AppError("Termo não encontrado", 404);
    }
    return assignment.termPdfPath;
  },
};
