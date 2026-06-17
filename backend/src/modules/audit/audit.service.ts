import { prisma } from "../../lib/prisma.js";

export const auditService = {
  // Lista os registros mais recentes da trilha de auditoria.
  // Se um tipo de equipamento (typeId) for informado, filtra os eventos
  // ligados a equipamentos daquele tipo.
  async list(typeId?: string) {
    return prisma.auditLog.findMany({
      where: typeId ? { equipment: { typeId } } : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        performedBy: { select: { name: true } },
        equipment: {
          select: { name: true, type: { select: { name: true } } },
        },
      },
    });
  },
};
