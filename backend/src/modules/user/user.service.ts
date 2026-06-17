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
}

export const userService = {
  // Lista usuários expondo apenas campos públicos (nunca o passwordHash).
  async list() {
    return prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { name: "asc" },
    });
  },

  // Cria um usuário (ação administrativa). O admin define o papel.
  async create(
    { name, email, password, role }: CreateUserInput,
    performedById: string
  ) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError("E-mail já cadastrado");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, passwordHash, role },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    await recordAudit({
      action: "USER_CREATED",
      entity: "User",
      entityId: user.id,
      performedById,
      metadata: { email, role },
    });
    return user;
  },
};
