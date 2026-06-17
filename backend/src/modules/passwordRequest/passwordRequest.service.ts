import { AppError } from "../../lib/AppError.js";
import { recordAudit } from "../../lib/audit.js";
import { decryptSecret } from "../../lib/crypto.js";
import { prisma } from "../../lib/prisma.js";

export const passwordRequestService = {
  // Admin: todas as solicitações, pendentes primeiro.
  async listAll() {
    return prisma.passwordRequest.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        equipment: { select: { id: true, name: true } },
        requester: { select: { id: true, name: true } },
      },
    });
  },

  // Colaborador: as próprias solicitações.
  async listMine(requesterId: string) {
    return prisma.passwordRequest.findMany({
      where: { requesterId },
      orderBy: { createdAt: "desc" },
      include: { equipment: { select: { id: true, name: true } } },
    });
  },

  // Colaborador cria uma solicitação de acesso às senhas de um equipamento.
  async create(
    { equipmentId, reason }: { equipmentId: string; reason?: string },
    requesterId: string
  ) {
    const equipment = await prisma.equipment.findUnique({
      where: { id: equipmentId },
    });
    if (!equipment) {
      throw new AppError("Equipamento não encontrado", 404);
    }

    // Evita solicitações pendentes duplicadas para o mesmo equipamento.
    const pending = await prisma.passwordRequest.findFirst({
      where: { equipmentId, requesterId, status: "PENDING" },
    });
    if (pending) {
      throw new AppError("Você já tem uma solicitação pendente para este equipamento");
    }

    const request = await prisma.passwordRequest.create({
      data: { equipmentId, requesterId, reason },
    });
    await recordAudit({
      action: "REQUEST_CREATED",
      entity: "PasswordRequest",
      entityId: request.id,
      equipmentId,
      performedById: requesterId,
    });
    return request;
  },

  // Admin aprova ou nega uma solicitação pendente.
  async resolve(id: string, action: "approve" | "deny", resolvedById: string) {
    const request = await prisma.passwordRequest.findUnique({ where: { id } });
    if (!request) {
      throw new AppError("Solicitação não encontrada", 404);
    }
    if (request.status !== "PENDING") {
      throw new AppError("Esta solicitação já foi resolvida");
    }

    const status = action === "approve" ? "APPROVED" : "DENIED";
    const updated = await prisma.passwordRequest.update({
      where: { id },
      data: { status, resolvedById, resolvedAt: new Date() },
    });
    await recordAudit({
      action: action === "approve" ? "REQUEST_APPROVED" : "REQUEST_DENIED",
      entity: "PasswordRequest",
      entityId: id,
      equipmentId: request.equipmentId,
      performedById: resolvedById,
    });
    return updated;
  },

  // Colaborador vê as senhas de uma solicitação APROVADA que é dele.
  // Cada visualização é auditada (compliance).
  async viewSecrets(id: string, userId: string) {
    const request = await prisma.passwordRequest.findUnique({ where: { id } });
    if (!request || request.requesterId !== userId) {
      throw new AppError("Solicitação não encontrada", 404);
    }
    if (request.status !== "APPROVED") {
      throw new AppError("Solicitação não aprovada", 403);
    }

    const credentials = await prisma.deviceCredential.findMany({
      where: { equipmentId: request.equipmentId },
    });

    const result = credentials.map((c) => ({
      id: c.id,
      label: c.label,
      username: c.username,
      secret: decryptSecret({
        secretEncrypted: c.secretEncrypted,
        iv: c.iv,
        authTag: c.authTag,
      }),
    }));

    await recordAudit({
      action: "CREDENTIAL_REVEALED",
      entity: "PasswordRequest",
      entityId: id,
      equipmentId: request.equipmentId,
      performedById: userId,
      metadata: { via: "request", count: result.length },
    });
    return result;
  },
};
