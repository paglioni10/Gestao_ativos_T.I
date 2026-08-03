import { AppError } from "../../lib/AppError.js";
import { recordAudit } from "../../lib/audit.js";
import { prisma } from "../../lib/prisma.js";
import { userService } from "../user/user.service.js";

export const passwordResetRequestService = {
  // Admin: todos os pedidos, pendentes primeiro, mais recentes primeiro.
  async listAll() {
    return prisma.passwordResetRequest.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        user: { select: { id: true, name: true, email: true } },
        resolvedBy: { select: { name: true } },
      },
    });
  },

  // Registra o pedido de redefinição (chamado a partir de "esqueci minha
  // senha"). Só cria o registro se o e-mail existir — quem chama decide se
  // revela isso ou não à pessoa (aqui sempre respondemos de forma genérica).
  async create(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return;

    await prisma.passwordResetRequest.create({
      data: { email, userId: user.id },
    });
    await recordAudit({
      action: "PASSWORD_RESET_REQUESTED",
      entity: "User",
      entityId: user.id,
      metadata: { email },
    });
  },

  // Admin define a nova senha diretamente a partir do pedido. Resolve este
  // pedido e também qualquer outro pedido pendente da mesma pessoa.
  async resolve(id: string, newPassword: string, resolvedById: string) {
    const request = await prisma.passwordResetRequest.findUnique({
      where: { id },
    });
    if (!request) {
      throw new AppError("Solicitação não encontrada", 404);
    }
    if (request.status !== "PENDING") {
      throw new AppError("Esta solicitação já foi resolvida");
    }

    await userService.resetPassword(request.userId, newPassword, resolvedById);

    const now = new Date();
    await prisma.passwordResetRequest.updateMany({
      where: { userId: request.userId, status: "PENDING" },
      data: { status: "RESOLVED", resolvedAt: now, resolvedById },
    });
  },
};
