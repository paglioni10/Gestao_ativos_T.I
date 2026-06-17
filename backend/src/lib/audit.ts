import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

interface RecordAuditInput {
  action: string; // ex: "EQUIPMENT_CREATED"
  entity: string; // ex: "Equipment"
  entityId: string;
  performedById?: string; // id do usuário que executou a ação
  equipmentId?: string; // equipamento relacionado, p/ filtrar por tipo
  metadata?: Prisma.InputJsonValue; // dados extras úteis para o histórico
}

// Grava um registro na trilha de auditoria. Centralizado aqui para não
// repetir prisma.auditLog.create em vários services.
export async function recordAudit({
  action,
  entity,
  entityId,
  performedById,
  equipmentId,
  metadata,
}: RecordAuditInput) {
  await prisma.auditLog.create({
    data: { action, entity, entityId, performedById, equipmentId, metadata },
  });
}
