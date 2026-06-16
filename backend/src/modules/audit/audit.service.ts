import { prisma } from "../../lib/prisma.js";

export const auditService = {
  // Lista os registros mais recentes da trilha de auditoria.
  async list() {
    return prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { performedBy: { select: { name: true } } },
    });
  },
};
