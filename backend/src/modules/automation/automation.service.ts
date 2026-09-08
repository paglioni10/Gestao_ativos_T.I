import { AppError } from "../../lib/AppError.js";
import { recordAudit } from "../../lib/audit.js";
import { isMailConfigured, sendMail } from "../../lib/mailer.js";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";

interface CreateLowStockInput {
  type?: "LOW_STOCK";
  equipmentTypeId: string;
  threshold: number;
  recipient: string;
  name?: string;
  active?: boolean;
}

interface CreateMaintenanceDueInput {
  type: "MAINTENANCE_DUE";
  leadDays: number;
  recipient: string;
  name?: string;
  active?: boolean;
}

type CreateAutomationInput = CreateLowStockInput | CreateMaintenanceDueInput;

interface UpdateAutomationInput {
  threshold?: number;
  leadDays?: number;
  recipient?: string;
  name?: string;
  active?: boolean;
}

// Nome automático quando o admin não informa um.
function defaultName(typeName: string): string {
  return `Estoque baixo — ${typeName}`;
}

const DAY_MS = 24 * 60 * 60 * 1000;

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
      availableNow: a.equipmentTypeId
        ? countByType.get(a.equipmentTypeId) ?? 0
        : 0,
    }));
  },

  async create(data: CreateAutomationInput, performedById: string) {
    if (data.type === "MAINTENANCE_DUE") {
      const automation = await prisma.automation.create({
        data: {
          type: "MAINTENANCE_DUE",
          name:
            data.name?.trim() ||
            `Prazo de manutenção — avisar ${data.leadDays} dia(s) antes`,
          leadDays: data.leadDays,
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
        metadata: { name: automation.name, leadDays: automation.leadDays },
      });
      return automation;
    }

    // LOW_STOCK
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
        ...(data.leadDays !== undefined ? { leadDays: data.leadDays } : {}),
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      metadata: { changes: data as any },
    });
    return automation;
  },

  // Envia um e-mail de teste para o destinatário da automação — serve para
  // validar a configuração SMTP sem precisar mexer no estoque real.
  async sendTest(id: string): Promise<{ sent: boolean; recipient: string }> {
    const automation = await prisma.automation.findUnique({
      where: { id },
      include: { equipmentType: { select: { name: true } } },
    });
    if (!automation) {
      throw new AppError("Automação não encontrada", 404);
    }
    if (!isMailConfigured()) {
      throw new AppError(
        "SMTP não configurado no servidor. Defina as variáveis SMTP_* para enviar e-mails.",
        400
      );
    }
    try {
      const { sent } = await sendMail({
        to: automation.recipient,
        subject: `Teste de automação — ${automation.name}`,
        html: `
          <p>Este é um <strong>e-mail de teste</strong> da automação "${automation.name}".</p>
          <p>Se você recebeu esta mensagem, o envio de e-mail está funcionando.</p>
          <p style="color:#888;font-size:12px">T.I STORAGE (American Burrs)</p>
        `,
      });
      return { sent, recipient: automation.recipient };
    } catch (err) {
      // Surfaça o motivo real do SMTP (auth, conexão etc.) em vez de um 500.
      const detail = err instanceof Error ? err.message : "erro desconhecido";
      throw new AppError(`Falha ao enviar e-mail: ${detail}`, 400);
    }
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
        const low = available <= (automation.threshold ?? 0);

        if (low && !automation.alreadyAlerted) {
          await this.fireLowStock(
            {
              ...automation,
              threshold: automation.threshold ?? 0,
              equipmentType: automation.equipmentType ?? { name: "—" },
            },
            available
          );
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

  // Checagem diária (disparada por cron externo) das automações de prazo de
  // manutenção. Para cada manutenção pendente (não concluída), envia UM e-mail
  // ao entrar na janela de antecedência (APPROACHING) e UM ao estourar o prazo
  // (OVERDUE). A tabela MaintenanceReminder garante idempotência — nunca repete
  // o mesmo aviso, mesmo rodando todo dia. Nunca lança para o chamador.
  async runMaintenanceChecks(): Promise<{
    emailConfigured: boolean;
    automations: number;
    pending: number;
    approachingSent: number;
    overdueSent: number;
  }> {
    const summary = {
      emailConfigured: isMailConfigured(),
      automations: 0,
      pending: 0,
      approachingSent: 0,
      overdueSent: 0,
    };
    try {
      const automations = await prisma.automation.findMany({
        where: { type: "MAINTENANCE_DUE", active: true },
      });
      summary.automations = automations.length;
      if (automations.length === 0) return summary;

      const now = new Date();
      const pending = await prisma.maintenanceRecord.findMany({
        where: { completedAt: null },
        include: { equipment: { select: { name: true } } },
        orderBy: { scheduledFor: "asc" },
      });
      summary.pending = pending.length;
      if (pending.length === 0) return summary;

      for (const automation of automations) {
        const lead = automation.leadDays ?? 0;
        for (const m of pending) {
          const dueMs = m.scheduledFor.getTime() - now.getTime();
          let kind: "APPROACHING" | "OVERDUE" | null = null;
          if (dueMs < 0) kind = "OVERDUE";
          else if (dueMs <= lead * DAY_MS) kind = "APPROACHING";
          if (!kind) continue;

          try {
            // Idempotência: pula se este aviso já foi enviado.
            const already = await prisma.maintenanceReminder.findUnique({
              where: {
                automationId_maintenanceRecordId_kind: {
                  automationId: automation.id,
                  maintenanceRecordId: m.id,
                  kind,
                },
              },
            });
            if (already) continue;

            await this.fireMaintenanceReminder(automation, m, kind, now);
            if (kind === "APPROACHING") summary.approachingSent += 1;
            else summary.overdueSent += 1;
          } catch (err) {
            console.error(
              `[automation] falha ao avisar manutenção ${m.id} (${kind}):`,
              err
            );
          }
        }
      }
    } catch (err) {
      console.error("[automation] falha na checagem de manutenções:", err);
    }
    return summary;
  },

  // Envia o e-mail de um aviso de manutenção, grava o registro de idempotência
  // e a trilha de auditoria. Lança se o envio falhar (o chamador conta/loga).
  async fireMaintenanceReminder(
    automation: { id: string; name: string; recipient: string },
    maintenance: {
      id: string;
      description: string;
      scheduledFor: Date;
      equipment: { name: string };
    },
    kind: "APPROACHING" | "OVERDUE",
    now: Date
  ): Promise<void> {
    const equip = maintenance.equipment.name;
    const dateStr = maintenance.scheduledFor.toLocaleDateString("pt-BR");
    const diffDays = Math.ceil(
      Math.abs(maintenance.scheduledFor.getTime() - now.getTime()) / DAY_MS
    );
    const link = `${env.corsOrigin}/equipamentos`;

    const subject =
      kind === "OVERDUE"
        ? `🔴 Manutenção vencida: ${equip}`
        : `🟠 Manutenção se aproximando: ${equip}`;
    const lead =
      kind === "OVERDUE"
        ? `<p>A manutenção de <strong>${equip}</strong> <strong>venceu</strong> em ${dateStr} (há ${diffDays} dia(s)) e ainda não foi concluída.</p>`
        : `<p>A manutenção de <strong>${equip}</strong> vence em <strong>${diffDays} dia(s)</strong> (prazo: ${dateStr}).</p>`;
    const html = `
      <p>Olá,</p>
      ${lead}
      <p>Descrição: ${maintenance.description}</p>
      <p><a href="${link}">Abrir a lista de equipamentos</a></p>
      <p style="color:#888;font-size:12px">Mensagem automática — T.I STORAGE (American Burrs)</p>
    `;

    const { sent } = await sendMail({
      to: automation.recipient,
      subject,
      html,
    });

    await prisma.maintenanceReminder.create({
      data: {
        automationId: automation.id,
        maintenanceRecordId: maintenance.id,
        kind,
      },
    });

    await prisma.automation.update({
      where: { id: automation.id },
      data: { lastTriggeredAt: new Date() },
    });

    await recordAudit({
      action: "AUTOMATION_TRIGGERED",
      entity: "Automation",
      entityId: automation.id,
      performedById: undefined,
      metadata: {
        name: automation.name,
        kind,
        equipment: equip,
        scheduledFor: maintenance.scheduledFor.toISOString(),
        recipient: automation.recipient,
        emailSent: sent,
      },
    });
  },
};
