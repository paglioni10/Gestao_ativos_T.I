import type { EquipmentType } from "@prisma/client";
import { AppError } from "../../lib/AppError.js";
import { recordAudit } from "../../lib/audit.js";
import { prisma } from "../../lib/prisma.js";
import type { EquipmentStatus } from "@prisma/client";

interface CreateEquipmentInput {
  name: string;
  type: EquipmentType;
  serialNumber: string;
  purchaseDate?: Date;
  warrantyUntil?: Date;
  notes?: string;
}

// Campos editáveis. Status NÃO entra aqui de propósito: a mudança para
// ASSIGNED é feita pelo fluxo de entrega (Fase 2), e a baixa pelo remove().
type UpdateEquipmentInput = Partial<CreateEquipmentInput>;

export const equipmentService = {
  // Lista equipamentos, opcionalmente filtrando por status.
  async list(status?: EquipmentStatus) {
    return prisma.equipment.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
    });
  },

  // Busca um equipamento e inclui suas atribuições (histórico de posse).
  async getById(id: string) {
    const equipment = await prisma.equipment.findUnique({
      where: { id },
      include: {
        assignments: {
          orderBy: { assignedAt: "desc" },
          include: { receiver: { select: { id: true, name: true } } },
        },
      },
    });
    if (!equipment) {
      throw new AppError("Equipamento não encontrado", 404);
    }
    return equipment;
  },

  // Cria um equipamento. O serialNumber é único (validado pelo banco).
  async create(data: CreateEquipmentInput, performedById: string) {
    const existing = await prisma.equipment.findUnique({
      where: { serialNumber: data.serialNumber },
    });
    if (existing) {
      throw new AppError("Já existe equipamento com este número de série");
    }

    const equipment = await prisma.equipment.create({ data });
    await recordAudit({
      action: "EQUIPMENT_CREATED",
      entity: "Equipment",
      entityId: equipment.id,
      performedById,
      metadata: { name: equipment.name, serialNumber: equipment.serialNumber },
    });
    return equipment;
  },

  // Atualiza os dados descritivos de um equipamento.
  async update(
    id: string,
    data: UpdateEquipmentInput,
    performedById: string
  ) {
    // Garante que existe (e dá um 404 claro se não).
    await this.getById(id);

    // Se o número de série mudou, não pode colidir com o de outro equipamento.
    if (data.serialNumber) {
      const other = await prisma.equipment.findUnique({
        where: { serialNumber: data.serialNumber },
      });
      if (other && other.id !== id) {
        throw new AppError("Já existe equipamento com este número de série");
      }
    }

    const equipment = await prisma.equipment.update({ where: { id }, data });
    await recordAudit({
      action: "EQUIPMENT_UPDATED",
      entity: "Equipment",
      entityId: id,
      performedById,
      metadata: { changes: data },
    });
    return equipment;
  },

  // "Baixa" um equipamento (soft delete): em vez de apagar a linha, muda o
  // status para RETIRED, preservando todo o histórico de atribuições.
  async remove(id: string, performedById: string) {
    const equipment = await this.getById(id);

    if (equipment.status === "ASSIGNED") {
      throw new AppError(
        "Não é possível dar baixa: o equipamento está atribuído a alguém. Registre a devolução primeiro."
      );
    }
    if (equipment.status === "RETIRED") {
      throw new AppError("Equipamento já está baixado");
    }

    const updated = await prisma.equipment.update({
      where: { id },
      data: { status: "RETIRED" },
    });
    await recordAudit({
      action: "EQUIPMENT_RETIRED",
      entity: "Equipment",
      entityId: id,
      performedById,
    });
    return updated;
  },
};
