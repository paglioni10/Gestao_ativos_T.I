import type { EquipmentStatus } from "@prisma/client";
import QRCode from "qrcode";
import { env } from "../../config/env.js";
import { AppError } from "../../lib/AppError.js";
import { recordAudit } from "../../lib/audit.js";
import { prisma } from "../../lib/prisma.js";

interface CreateEquipmentInput {
  name: string;
  typeId: string;
  serialNumber: string;
  purchaseDate?: Date;
  warrantyUntil?: Date;
  notes?: string;
}

// Campos editáveis. Status NÃO entra aqui de propósito: a mudança para
// ASSIGNED é feita pelo fluxo de entrega (Fase 2), e a baixa pelo remove().
type UpdateEquipmentInput = Partial<CreateEquipmentInput>;

export const equipmentService = {
  // Lista equipamentos, opcionalmente filtrando por status e/ou tipo.
  async list(status?: EquipmentStatus, typeId?: string) {
    return prisma.equipment.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(typeId ? { typeId } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: { type: { select: { id: true, name: true } } },
    });
  },

  // Busca um equipamento e inclui histórico de posse e de manutenções.
  async getById(id: string) {
    const equipment = await prisma.equipment.findUnique({
      where: { id },
      include: {
        type: { select: { id: true, name: true } },
        assignments: {
          orderBy: { assignedAt: "desc" },
          include: {
            receiver: { select: { id: true, name: true, sector: true } },
          },
        },
        maintenances: { orderBy: { scheduledFor: "desc" } },
      },
    });
    if (!equipment) {
      throw new AppError("Equipamento não encontrado", 404);
    }
    return equipment;
  },

  // Ficha PÚBLICA (sem login), acessada ao escanear o QR Code do aparelho.
  // Expõe apenas dados não sensíveis: nada de credenciais, observações
  // internas ou histórico completo. Só o essencial para identificar o ativo
  // e saber com quem ele está agora.
  async getPublicById(id: string) {
    const equipment = await prisma.equipment.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        serialNumber: true,
        status: true,
        purchaseDate: true,
        warrantyUntil: true,
        type: { select: { name: true } },
        assignments: {
          where: { status: "ACTIVE" },
          take: 1,
          include: {
            receiver: { select: { name: true, sector: true } },
          },
        },
      },
    });
    if (!equipment) {
      throw new AppError("Equipamento não encontrado", 404);
    }

    const active = equipment.assignments[0];
    return {
      id: equipment.id,
      name: equipment.name,
      serialNumber: equipment.serialNumber,
      status: equipment.status,
      purchaseDate: equipment.purchaseDate,
      warrantyUntil: equipment.warrantyUntil,
      type: equipment.type,
      currentHolder: active
        ? { name: active.receiver.name, sector: active.receiver.sector }
        : null,
    };
  },

  // Gera um QR Code (data URL PNG) que aponta para a FICHA PÚBLICA do
  // equipamento. Escanear o código abre uma página read-only sem exigir
  // login — pensada para etiqueta colada no aparelho.
  async getQrCode(id: string) {
    await this.getById(id); // garante que o equipamento existe
    const url = `${env.corsOrigin}/ficha/${id}`;
    const qrCode = await QRCode.toDataURL(url, { width: 240, margin: 1 });
    return { url, qrCode };
  },

  // Cria um equipamento. O serialNumber é único (validado pelo banco).
  async create(data: CreateEquipmentInput, performedById: string) {
    const existing = await prisma.equipment.findUnique({
      where: { serialNumber: data.serialNumber },
    });
    if (existing) {
      throw new AppError("Já existe equipamento com este número de série");
    }

    const type = await prisma.equipmentType.findUnique({
      where: { id: data.typeId },
    });
    if (!type) {
      throw new AppError("Tipo de equipamento inválido");
    }

    const equipment = await prisma.equipment.create({ data });
    await recordAudit({
      action: "EQUIPMENT_CREATED",
      entity: "Equipment",
      entityId: equipment.id,
      equipmentId: equipment.id,
      performedById,
      metadata: { name: equipment.name, serialNumber: equipment.serialNumber },
    });
    return equipment;
  },

  // Atualiza os dados descritivos de um equipamento.
  async update(
    id: string,
    data: UpdateEquipmentInput,
    performedById: string
  ) {
    // Garante que existe (e dá um 404 claro se não).
    await this.getById(id);

    // Se o número de série mudou, não pode colidir com o de outro equipamento.
    if (data.serialNumber) {
      const other = await prisma.equipment.findUnique({
        where: { serialNumber: data.serialNumber },
      });
      if (other && other.id !== id) {
        throw new AppError("Já existe equipamento com este número de série");
      }
    }

    const equipment = await prisma.equipment.update({ where: { id }, data });
    await recordAudit({
      action: "EQUIPMENT_UPDATED",
      entity: "Equipment",
      entityId: id,
      equipmentId: id,
      performedById,
      metadata: { changes: data },
    });
    return equipment;
  },

  // "Baixa" um equipamento (soft delete): em vez de apagar a linha, muda o
  // status para RETIRED, preservando todo o histórico de atribuições.
  async remove(id: string, performedById: string) {
    const equipment = await this.getById(id);

    if (equipment.status === "ASSIGNED") {
      throw new AppError(
        "Não é possível dar baixa: o equipamento está atribuído a alguém. Registre a devolução primeiro."
      );
    }
    if (equipment.status === "RETIRED") {
      throw new AppError("Equipamento já está baixado");
    }

    const updated = await prisma.equipment.update({
      where: { id },
      data: { status: "RETIRED" },
    });
    await recordAudit({
      action: "EQUIPMENT_RETIRED",
      entity: "Equipment",
      entityId: id,
      equipmentId: id,
      performedById,
    });
    return updated;
  },

  // Exclui DEFINITIVAMENTE um equipamento (hard delete), diferente da baixa.
  // Regras: não pode estar atribuído a alguém; apenas admin (garantido na
  // rota). Como assignments/manutenções/credenciais têm FK obrigatória para
  // o equipamento, são removidos junto; a trilha de auditoria é preservada
  // (equipmentId vira null) para não perder o histórico de ações.
  async hardDelete(id: string, performedById: string, reason: string) {
    const equipment = await this.getById(id);

    if (equipment.status === "ASSIGNED") {
      throw new AppError(
        "Não é possível excluir: o equipamento está atribuído a alguém. Registre a devolução primeiro."
      );
    }

    await prisma.$transaction([
      prisma.auditLog.updateMany({
        where: { equipmentId: id },
        data: { equipmentId: null },
      }),
      prisma.deviceCredential.deleteMany({ where: { equipmentId: id } }),
      prisma.maintenanceRecord.deleteMany({ where: { equipmentId: id } }),
      prisma.assignment.deleteMany({ where: { equipmentId: id } }),
      prisma.equipment.delete({ where: { id } }),
    ]);

    await recordAudit({
      action: "EQUIPMENT_DELETED",
      entity: "Equipment",
      entityId: id,
      performedById,
      metadata: {
        name: equipment.name,
        serialNumber: equipment.serialNumber,
        reason,
      },
    });
  },
};
