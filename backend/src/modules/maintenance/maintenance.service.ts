import { AppError } from "../../lib/AppError.js";
import { recordAudit } from "../../lib/audit.js";
import { prisma } from "../../lib/prisma.js";

interface CreateMaintenanceInput {
  equipmentId: string;
  description: string;
  scheduledFor: Date;
}

export const maintenanceService = {
  // Lista manutenções, mais recentes primeiro, com o equipamento.
  async list() {
    return prisma.maintenanceRecord.findMany({
      orderBy: { scheduledFor: "desc" },
      include: {
        equipment: { select: { id: true, name: true, serialNumber: true } },
      },
    });
  },

  // Agenda uma manutenção e coloca o equipamento em MAINTENANCE.
  async create(
    { equipmentId, description, scheduledFor }: CreateMaintenanceInput,
    performedById: string
  ) {
    const equipment = await prisma.equipment.findUnique({
      where: { id: equipmentId },
    });
    if (!equipment) {
      throw new AppError("Equipamento não encontrado", 404);
    }
    if (equipment.status === "ASSIGNED") {
      throw new AppError(
        "Equipamento está atribuído; registre a devolução antes de enviar para manutenção"
      );
    }
    if (equipment.status === "RETIRED") {
      throw new AppError("Equipamento está baixado");
    }

    // Criar o registro e mudar o status precisam ser atômicos.
    const record = await prisma.$transaction(async (tx) => {
      const created = await tx.maintenanceRecord.create({
        data: { equipmentId, description, scheduledFor },
      });
      await tx.equipment.update({
        where: { id: equipmentId },
        data: { status: "MAINTENANCE" },
      });
      return created;
    });

    await recordAudit({
      action: "MAINTENANCE_SCHEDULED",
      entity: "Equipment",
      entityId: equipmentId,
      performedById,
      metadata: { maintenanceId: record.id, description },
    });
    return record;
  },

  // Conclui uma manutenção e devolve o equipamento para AVAILABLE.
  async complete(id: string, performedById: string) {
    const record = await prisma.maintenanceRecord.findUnique({ where: { id } });
    if (!record) {
      throw new AppError("Manutenção não encontrada", 404);
    }
    if (record.completedAt) {
      throw new AppError("Manutenção já foi concluída");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.maintenanceRecord.update({
        where: { id },
        data: { completedAt: new Date() },
      });
      await tx.equipment.update({
        where: { id: record.equipmentId },
        data: { status: "AVAILABLE" },
      });
      return result;
    });

    await recordAudit({
      action: "MAINTENANCE_COMPLETED",
      entity: "Equipment",
      entityId: record.equipmentId,
      performedById,
      metadata: { maintenanceId: id },
    });
    return updated;
  },
};
