import { AppError } from "../../lib/AppError.js";
import { prisma } from "../../lib/prisma.js";

export const assignmentService = {
  // Lista atribuições, opcionalmente filtrando por status.
  async list() {
    return prisma.assignment.findMany({
      orderBy: { assignedAt: "desc" },
      include: {
        equipment: { select: { id: true, name: true, serialNumber: true } },
        receiver: { select: { id: true, name: true } },
      },
    });
  },

  // TODO (entrega): registrar entrega de um equipamento a um usuário.
  // Regras a implementar:
  //  1. Equipamento precisa existir e estar com status AVAILABLE.
  //  2. Criar Assignment (status ACTIVE) ligando equipamento + receiver + admin.
  //  3. Mudar o status do equipamento para ASSIGNED.
  //  4. Idealmente envolver 2 e 3 numa transação (prisma.$transaction).
  //  5. Registrar AuditLog "ASSIGNMENT_CREATED".
  //  6. (extra) gerar o PDF do termo e salvar signatureHash.
  async create() {
    throw new AppError("Não implementado", 501);
  },

  // TODO (devolução): marcar uma atribuição como devolvida.
  // Regras: setar returnedAt + status RETURNED e devolver equipamento p/ AVAILABLE.
  async returnEquipment() {
    throw new AppError("Não implementado", 501);
  },
};
