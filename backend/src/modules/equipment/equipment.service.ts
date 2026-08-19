import type { EquipmentStatus, Prisma } from "@prisma/client";
import QRCode from "qrcode";
import { env } from "../../config/env.js";
import { AppError } from "../../lib/AppError.js";
import { recordAudit } from "../../lib/audit.js";
import { prisma } from "../../lib/prisma.js";
import { automationService } from "../automation/automation.service.js";

interface CreateEquipmentInput {
  name: string;
  typeId: string;
  serialNumber?: string;
  purchaseDate?: Date;
  warrantyUntil?: Date;
  notes?: string;
}

// Campos editáveis. Status NÃO entra aqui de propósito: a mudança para
// ASSIGNED é feita pelo fluxo de entrega (Fase 2), e a baixa pelo remove().
type UpdateEquipmentInput = Partial<CreateEquipmentInput>;

export const equipmentService = {
  // Lista equipamentos, opcionalmente filtrando por status e/ou tipo.
  async list(status?: EquipmentStatus, typeId?: string) {
    return prisma.equipment.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(typeId ? { typeId } : {}),
      },
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
          include: {
            receiver: { select: { id: true, name: true, sector: true } },
          },
        },
        maintenances: { orderBy: { scheduledFor: "desc" } },
      },
    });
    if (!equipment) {
      throw new AppError("Equipamento não encontrado", 404);
    }
    return equipment;
  },

  // Ficha PÚBLICA (sem login), acessada ao escanear o QR Code do aparelho.
  // Expõe apenas dados não sensíveis: nada de credenciais, observações
  // internas ou histórico completo. Só o essencial para identificar o ativo
  // e saber com quem ele está agora.
  async getPublicById(id: string) {
    const equipment = await prisma.equipment.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        serialNumber: true,
        status: true,
        purchaseDate: true,
        warrantyUntil: true,
        type: { select: { name: true } },
        assignments: {
          where: { status: "ACTIVE" },
          take: 1,
          include: {
            receiver: { select: { name: true, sector: true } },
          },
        },
      },
    });
    if (!equipment) {
      throw new AppError("Equipamento não encontrado", 404);
    }

    const active = equipment.assignments[0];
    return {
      id: equipment.id,
      name: equipment.name,
      serialNumber: equipment.serialNumber,
      status: equipment.status,
      purchaseDate: equipment.purchaseDate,
      warrantyUntil: equipment.warrantyUntil,
      type: equipment.type,
      currentHolder: active
        ? { name: active.receiver.name, sector: active.receiver.sector }
        : null,
    };
  },

  // Gera um QR Code (data URL PNG) que aponta para a FICHA PÚBLICA do
  // equipamento. Escanear o código abre uma página read-only sem exigir
  // login — pensada para etiqueta colada no aparelho.
  async getQrCode(id: string) {
    await this.getById(id); // garante que o equipamento existe
    const url = `${env.corsOrigin}/ficha/${id}`;
    const qrCode = await QRCode.toDataURL(url, { width: 240, margin: 1 });
    return { url, qrCode };
  },

  // Cria um equipamento. A obrigatoriedade do nº de série depende da regra
  // do tipo (serialRequired). Quando não informado, é gravado como null.
  async create(data: CreateEquipmentInput, performedById: string) {
    const type = await prisma.equipmentType.findUnique({
      where: { id: data.typeId },
    });
    if (!type) {
      throw new AppError("Tipo de equipamento inválido");
    }

    const serial = data.serialNumber?.trim() || null;

    if (type.serialRequired && !serial) {
      throw new AppError(
        `Nº de série é obrigatório para equipamentos do tipo "${type.name}".`
      );
    }

    if (serial) {
      const existing = await prisma.equipment.findUnique({
        where: { serialNumber: serial },
      });
      if (existing) {
        throw new AppError("Já existe equipamento com este número de série");
      }
    }

    const equipment = await prisma.equipment.create({
      data: { ...data, serialNumber: serial },
    });
    await recordAudit({
      action: "EQUIPMENT_CREATED",
      entity: "Equipment",
      entityId: equipment.id,
      equipmentId: equipment.id,
      performedById,
      metadata: { name: equipment.name, serialNumber: equipment.serialNumber },
    });

    // Novo equipamento AVAILABLE aumenta o estoque do tipo: reavalia (pode
    // rearmar um alerta de estoque baixo).
    await automationService.evaluateForType(equipment.typeId);
    return equipment;
  },

  // Importa vários equipamentos de uma planilha (rejeição parcial): cada
  // linha é validada e criada individualmente; as válidas entram, as
  // inválidas voltam num relatório com o motivo. O "Tipo" vem por NOME e é
  // casado com os tipos cadastrados (ignora acento/maiúscula).
  async importMany(
    rows: { name?: string; type?: string; serialNumber?: string; notes?: string }[],
    performedById: string
  ) {
    const types = await prisma.equipmentType.findMany();
    const norm = (s: string) =>
      s
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    const typeByName = new Map(types.map((t) => [norm(t.name), t]));

    let created = 0;
    const errors: { line: number; message: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const line = i + 2; // linha 1 = cabeçalho na planilha
      const row = rows[i];
      const name = (row.name ?? "").trim();
      const typeName = (row.type ?? "").trim();

      // Linha totalmente vazia é ignorada silenciosamente.
      if (!name && !typeName && !(row.serialNumber ?? "").trim()) continue;

      if (name.length < 2) {
        errors.push({ line, message: "Nome deve ter no mínimo 2 caracteres" });
        continue;
      }
      const type = typeByName.get(norm(typeName));
      if (!type) {
        errors.push({
          line,
          message: `Tipo "${typeName || "(vazio)"}" não está cadastrado`,
        });
        continue;
      }

      try {
        await this.create(
          {
            name,
            typeId: type.id,
            serialNumber: row.serialNumber,
            notes: row.notes,
          },
          performedById
        );
        created++;
      } catch (err) {
        errors.push({
          line,
          message: err instanceof AppError ? err.message : "Erro ao cadastrar",
        });
      }
    }

    return { created, errors, total: rows.length };
  },

  // Atualiza os dados descritivos de um equipamento.
  async update(
    id: string,
    data: UpdateEquipmentInput,
    performedById: string
  ) {
    // Garante que existe (e dá um 404 claro se não).
    const current = await this.getById(id);

    // Normaliza o nº de série quando enviado no update (vazio => null).
    const data2: Prisma.EquipmentUncheckedUpdateInput = { ...data };
    if (data.serialNumber !== undefined) {
      const serial = data.serialNumber?.trim() || null;
      data2.serialNumber = serial;

      // Respeita a regra do tipo (o do update, se mudou, senão o atual).
      const typeId = data.typeId ?? current.typeId;
      const type = await prisma.equipmentType.findUnique({ where: { id: typeId } });
      if (type?.serialRequired && !serial) {
        throw new AppError(
          `Nº de série é obrigatório para equipamentos do tipo "${type.name}".`
        );
      }

      // Se informado, não pode colidir com o de outro equipamento.
      if (serial) {
        const other = await prisma.equipment.findUnique({
          where: { serialNumber: serial },
        });
        if (other && other.id !== id) {
          throw new AppError("Já existe equipamento com este número de série");
        }
      }
    }

    const equipment = await prisma.equipment.update({
      where: { id },
      data: data2,
    });
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

    // Baixa reduz o estoque disponível do tipo: reavalia automações.
    await automationService.evaluateForType(equipment.typeId);
    return updated;
  },

  // Exclui DEFINITIVAMENTE um equipamento (hard delete), diferente da baixa.
  // Regras: não pode estar atribuído a alguém; apenas admin (garantido na
  // rota). Como assignments/manutenções/credenciais têm FK obrigatória para
  // o equipamento, são removidos junto; a trilha de auditoria é preservada
  // (equipmentId vira null) para não perder o histórico de ações.
  async hardDelete(id: string, performedById: string, reason: string) {
    const equipment = await this.getById(id);

    if (equipment.status === "ASSIGNED") {
      throw new AppError(
        "Não é possível excluir: o equipamento está atribuído a alguém. Registre a devolução primeiro."
      );
    }

    await prisma.$transaction([
      prisma.auditLog.updateMany({
        where: { equipmentId: id },
        data: { equipmentId: null },
      }),
      prisma.deviceCredential.deleteMany({ where: { equipmentId: id } }),
      prisma.maintenanceRecord.deleteMany({ where: { equipmentId: id } }),
      prisma.assignment.deleteMany({ where: { equipmentId: id } }),
      prisma.equipment.delete({ where: { id } }),
    ]);

    await recordAudit({
      action: "EQUIPMENT_DELETED",
      entity: "Equipment",
      entityId: id,
      performedById,
      metadata: {
        name: equipment.name,
        serialNumber: equipment.serialNumber,
        reason,
      },
    });

    // Exclusão pode ter reduzido o estoque disponível do tipo: reavalia.
    await automationService.evaluateForType(equipment.typeId);
  },
};
