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
  // Lista usuários ativos, expondo apenas campos públicos (nunca o
  // passwordHash). Usuários excluídos (active=false) não aparecem aqui.
  async list() {
    return prisma.user.findMany({
      where: { active: true },
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

  // "Exclui" um usuário (baixa lógica: active=false — ver comentário no
  // schema). Qualquer equipamento atribuído a ele fica disponível de novo,
  // e cada liberação é auditada individualmente.
  async remove(id: string, performedById: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || !user.active) {
      throw new AppError("Usuário não encontrado", 404);
    }
    if (id === performedById) {
      throw new AppError("Você não pode excluir sua própria conta");
    }
    if (user.role === "ADMIN") {
      const otherAdmins = await prisma.user.count({
        where: { role: "ADMIN", active: true, id: { not: id } },
      });
      if (otherAdmins === 0) {
        throw new AppError("Não é possível excluir o único administrador");
      }
    }

    const activeAssignments = await prisma.assignment.findMany({
      where: { receiverId: id, status: "ACTIVE" },
      include: { equipment: { select: { id: true, name: true } } },
    });

    // As duas escritas (fechar atribuição + liberar equipamento + desativar
    // usuário) precisam ser atômicas, como em qualquer outra transação do app.
    await prisma.$transaction(async (tx) => {
      for (const assignment of activeAssignments) {
        await tx.assignment.update({
          where: { id: assignment.id },
          data: { status: "RETURNED", returnedAt: new Date() },
        });
        await tx.equipment.update({
          where: { id: assignment.equipmentId },
          data: { status: "AVAILABLE" },
        });
      }
      await tx.user.update({ where: { id }, data: { active: false } });
    });

    for (const assignment of activeAssignments) {
      await recordAudit({
        action: "EQUIPMENT_RELEASED_USER_DELETED",
        entity: "Equipment",
        entityId: assignment.equipmentId,
        equipmentId: assignment.equipmentId,
        performedById,
        metadata: { equipmentName: assignment.equipment.name, userName: user.name },
      });
    }

    await recordAudit({
      action: "USER_DELETED",
      entity: "User",
      entityId: id,
      performedById,
      metadata: { name: user.name, email: user.email, releasedCount: activeAssignments.length },
    });
  },
};
