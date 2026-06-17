import type { EquipmentStatus } from "@prisma/client";
import QRCode from "qrcode";
import { env } from "../../config/env.js";
import { AppError } from "../../lib/AppError.js";
import { recordAudit } from "../../lib/audit.js";
import { prisma } from "../../lib/prisma.js";

interface CreateEquipmentInput {
  name: string;
  typeId: string;
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
      include: { type: { select: { id: true, name: true } } },
    });
  },

  // Busca um equipamento e inclui histórico de posse e de manutenções.
  async getById(id: string) {
    const equipment = await prisma.equipment.findUnique({
      where: { id },
      include: {
        type: { select: { id: true, name: true } },
        assignments: {
          orderBy: { assignedAt: "desc" },
          include: { receiver: { select: { id: true, name: true } } },
        },
        maintenances: { orderBy: { scheduledFor: "desc" } },
      },
    });
    if (!equipment) {
      throw new AppError("Equipamento não encontrado", 404);
    }
    return equipment;
  },

  // Gera um QR Code (data URL PNG) que aponta para a ficha do equipamento.
  // Escanear o código abre a página de detalhe no frontend.
  async getQrCode(id: string) {
    await this.getById(id); // garante que o equipamento existe
    const url = `${env.corsOrigin}/equipamentos/${id}`;
    const qrCode = await QRCode.toDataURL(url, { width: 240, margin: 1 });
    return { url, qrCode };
  },

  // Cria um equipamento. O serialNumber é único (validado pelo banco).
  async create(data: CreateEquipmentInput, performedById: string) {
    const existing = await prisma.equipment.findUnique({
      where: { serialNumber: data.serialNumber },
    });
    if (existing) {
      throw new AppError("Já existe equipamento com este número de série");
    }

    const type = await prisma.equipmentType.findUnique({
      where: { id: data.typeId },
    });
    if (!type) {
      throw new AppError("Tipo de equipamento inválido");
    }

    const equipment = await prisma.equipment.create({ data });
    await recordAudit({
      action: "EQUIPMENT_CREATED",
      entity: "Equipment",
      entityId: equipment.id,
      equipmentId: equipment.id,
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
      equipmentId: id,
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
      equipmentId: id,
      performedById,
    });
    return updated;
  },
};
