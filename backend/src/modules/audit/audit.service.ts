import type { EquipmentType } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

export const auditService = {
  // Lista os registros mais recentes da trilha de auditoria.
  // Se um tipo de equipamento for informado, filtra os eventos ligados a
  // equipamentos daquele tipo.
  async list(equipmentType?: EquipmentType) {
    return prisma.auditLog.findMany({
      where: equipmentType ? { equipment: { type: equipmentType } } : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        performedBy: { select: { name: true } },
        equipment: { select: { name: true, type: true } },
      },
    });
  },
};
