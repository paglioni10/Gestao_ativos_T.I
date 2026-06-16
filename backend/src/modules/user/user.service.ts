import { prisma } from "../../lib/prisma.js";

export const userService = {
  // Lista usuários expondo apenas campos públicos (nunca o passwordHash).
  async list() {
    return prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { name: "asc" },
    });
  },

  // TODO: detalhe de um usuário com o histórico de equipamentos recebidos.
};
