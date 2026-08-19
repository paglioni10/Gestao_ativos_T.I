import { AppError } from "../../lib/AppError.js";
import { recordAudit } from "../../lib/audit.js";
import { sendMail } from "../../lib/mailer.js";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";

interface CreateAutomationInput {
  equipmentTypeId: string;
  threshold: number;
  recipient: string;
  name?: string;
  active?: boolean;
}

type UpdateAutomationInput = Partial<CreateAutomationInput>;

// Nome automático quando o admin não informa um.
function defaultName(typeName: string): string {
  return `Estoque baixo — ${typeName}`;
}

export const automationService = {
  // Lista as automações com o nome do tipo e a contagem atual de disponíveis
  // (para o admin ver, na tela, o quão perto está do limite).
  async list() {
    const [automations, availableByType] = await Promise.all([
      prisma.automation.findMany({
        orderBy: { createdAt: "desc" },
        include: { equipmentType: { select: { id: true, name: true } } },
      }),
      prisma.equipment.groupBy({
        by: ["typeId"],
        where: { status: "AVAILABLE" },
        _count: { _all: true },
      }),
    ]);
    const countByType = new Map(
      availableByType.map((r) => [r.typeId, r._count._all])
    );
    return automations.map((a) => ({
      ...a,
      availableNow: countByType.get(a.equipmentTypeId) ?? 0,
    }));
  },

  async create(data: CreateAutomationInput, performedById: string) {
    const type = await prisma.equipmentType.findUnique({
      where: { id: data.equipmentTypeId },
    });
    if (!type) {
      throw new AppError("Tipo de equipamento inválido");
    }
    // Uma automação de estoque baixo por tipo (evita duplicidade confusa).
    const existing = await prisma.automation.findFirst({
      where: { equipmentTypeId: data.equipmentTypeId, type: "LOW_STOCK" },
    });
    if (existing) {
      throw new AppError(
        `Já existe uma automação de estoque baixo para o tipo "${type.name}".`
      );
    }

    const automation = await prisma.automation.create({
      data: {
        type: "LOW_STOCK",
        name: data.name?.trim() || defaultName(type.name),
        equipmentTypeId: data.equipmentTypeId,
        threshold: data.threshold,
        channel: "EMAIL",
        recipient: data.recipient.trim(),
        active: data.active ?? true,
      },
    });

    await recordAudit({
      action: "AUTOMATION_CREATED",
      entity: "Automation",
      entityId: automation.id,
      performedById,
      metadata: { name: automation.name, threshold: automation.threshold },
    });
    return automation;
  },

  async update(id: string, data: UpdateAutomationInput, performedById: string) {
    const current = await prisma.automation.findUnique({ where: { id } });
    if (!current) {
      throw new AppError("Automação não encontrada", 404);
    }

    const automation = await prisma.automation.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.threshold !== undefined ? { threshold: data.threshold } : {}),
        ...(data.recipient !== undefined
          ? { recipient: data.recipient.trim() }
          : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
        // Ao editar limite/estado, zera o "já avisei" para reavaliar do zero.
        alreadyAlerted: false,
      },
    });

    await recordAudit({
      action: "AUTOMATION_UPDATED",
      entity: "Automation",
      entityId: id,
      performedById,
      metadata: { changes: data },
    });
    return automation;
  },

  async remove(id: string, performedById: string) {
    const automation = await prisma.automation.findUnique({ where: { id } });
    if (!automation) {
      throw new AppError("Automação não encontrada", 404);
    }
    await prisma.automation.delete({ where: { id } });
    await recordAudit({
      action: "AUTOMATION_DELETED",
      entity: "Automation",
      entityId: id,
      performedById,
      metadata: { name: automation.name },
    });
  },

  // Avalia as automações de estoque baixo de um tipo após uma mudança de
  // estoque. Dispara o e-mail apenas na VIRADA (>N -> <=N) e reseta o
  // "já avisei" quando o estoque volta a subir acima do limite. Nunca lança
  // erro para o chamador — uma falha aqui não pode quebrar a operação
  // principal (entrega, devolução, manutenção etc.).
  async evaluateForType(equipmentTypeId: string): Promise<void> {
    try {
      const automations = await prisma.automation.findMany({
        where: { equipmentTypeId, type: "LOW_STOCK", active: true },
        include: { equipmentType: { select: { name: true } } },
      });
      if (automations.length === 0) return;

      const available = await prisma.equipment.count({
        where: { typeId: equipmentTypeId, status: "AVAILABLE" },
      });

      for (const automation of automations) {
        const low = available <= automation.threshold;

        if (low && !automation.alreadyAlerted) {
          await this.fireLowStock(automation, available);
        } else if (!low && automation.alreadyAlerted) {
          // Estoque se recuperou: rearma o alerta para a próxima virada.
          await prisma.automation.update({
            where: { id: automation.id },
            data: { alreadyAlerted: false },
          });
        }
      }
    } catch (err) {
      console.error("[automation] falha ao avaliar estoque baixo:", err);
    }
  },

  // Envia o e-mail de estoque baixo, marca como avisado e registra na trilha.
  async fireLowStock(
    automation: {
      id: string;
      name: string;
      recipient: string;
      threshold: number;
      equipmentType: { name: string };
    },
    available: number
  ): Promise<void> {
    const typeName = automation.equipmentType.name;
    const subject = `⚠️ Estoque baixo: ${typeName}`;
    const link = `${env.corsOrigin}/equipamentos`;
    const html = `
      <p>Olá,</p>
      <p>O estoque de <strong>${typeName}</strong> está baixo.</p>
      <p>Disponíveis agora: <strong>${available}</strong> (limite configurado: ${automation.threshold}).</p>
      <p>Recomendamos providenciar a compra/reposição deste equipamento.</p>
      <p><a href="${link}">Abrir a lista de equipamentos</a></p>
      <p style="color:#888;font-size:12px">Mensagem automática — T.I STORAGE (American Burrs)</p>
    `;

    const { sent } = await sendMail({
      to: automation.recipient,
      subject,
      html,
    });

    await prisma.automation.update({
      where: { id: automation.id },
      data: { alreadyAlerted: true, lastTriggeredAt: new Date() },
    });

    await recordAudit({
      action: "AUTOMATION_TRIGGERED",
      entity: "Automation",
      entityId: automation.id,
      performedById: undefined,
      metadata: {
        name: automation.name,
        type: typeName,
        available,
        threshold: automation.threshold,
        recipient: automation.recipient,
        emailSent: sent,
      },
    });
  },
};
