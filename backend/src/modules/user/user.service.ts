import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import { AppError } from "../../lib/AppError.js";
import { recordAudit } from "../../lib/audit.js";
import { prisma } from "../../lib/prisma.js";

interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: Role;
  jobTitle: string;
}

export const userService = {
  // Lista usuários expondo apenas campos públicos (nunca o passwordHash).
  async list() {
    return prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        jobTitle: true,
        createdAt: true,
      },
      orderBy: { name: "asc" },
    });
  },

  // Cria um usuário (ação administrativa). O admin define o papel e o cargo.
  async create(
    { name, email, password, role, jobTitle }: CreateUserInput,
    performedById: string
  ) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError("E-mail já cadastrado");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, passwordHash, role, jobTitle },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        jobTitle: true,
        createdAt: true,
      },
    });

    await recordAudit({
      action: "USER_CREATED",
      entity: "User",
      entityId: user.id,
      performedById,
      metadata: { email, role, jobTitle },
    });
    return user;
  },

  // Redefine a senha de um usuário (admin), tipicamente em resposta a um
  // pedido de "esqueci minha senha". A nova senha é comunicada por fora
  // (Teams, presencial etc.) — o projeto não tem envio de e-mail.
  async resetPassword(id: string, newPassword: string, performedById: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new AppError("Usuário não encontrado", 404);
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id }, data: { passwordHash } });

    await recordAudit({
      action: "USER_PASSWORD_RESET",
      entity: "User",
      entityId: id,
      performedById,
    });
  },
};
