import { Request, Response } from "express";
import { z } from "zod";
import { automationService } from "./automation.service.js";

// Nome é opcional; string vazia vira "sem nome" (gerado automático).
const optionalName = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().min(2, "Nome deve ter no mínimo 2 caracteres").optional()
);

// Estoque baixo (padrão): sem `type` no body significa LOW_STOCK.
const lowStockSchema = z.object({
  type: z.literal("LOW_STOCK").optional(),
  equipmentTypeId: z.string().uuid("Tipo de equipamento inválido"),
  threshold: z.coerce
    .number({ required_error: "Informe o limite" })
    .int("O limite deve ser um número inteiro")
    .min(0, "O limite não pode ser negativo"),
  recipient: z.string().email("E-mail do destinatário inválido"),
  name: optionalName,
  active: z.boolean().optional(),
});

// Prazo de manutenção: global, com dias de antecedência.
const maintenanceSchema = z.object({
  type: z.literal("MAINTENANCE_DUE"),
  leadDays: z.coerce
    .number({ required_error: "Informe os dias de antecedência" })
    .int("Os dias de antecedência devem ser um número inteiro")
    .min(0, "Não pode ser negativo")
    .max(3650, "Valor muito alto"),
  recipient: z.string().email("E-mail do destinatário inválido"),
  name: optionalName,
  active: z.boolean().optional(),
});

const createSchema = z.union([maintenanceSchema, lowStockSchema]);

const updateSchema = z
  .object({
    threshold: z.coerce.number().int().min(0).optional(),
    leadDays: z.coerce.number().int().min(0).max(3650).optional(),
    recipient: z.string().email("E-mail do destinatário inválido").optional(),
    name: optionalName,
    active: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "Informe ao menos um campo para atualizar",
  });

export const automationController = {
  async list(_req: Request, res: Response) {
    const automations = await automationService.list();
    return res.json(automations);
  },

  async create(req: Request, res: Response) {
    const data = createSchema.parse(req.body);
    const automation = await automationService.create(data, req.user!.sub);
    return res.status(201).json(automation);
  },

  async update(req: Request, res: Response) {
    const data = updateSchema.parse(req.body);
    const automation = await automationService.update(
      req.params.id,
      data,
      req.user!.sub
    );
    return res.json(automation);
  },

  async remove(req: Request, res: Response) {
    await automationService.remove(req.params.id, req.user!.sub);
    return res.status(204).send();
  },

  async sendTest(req: Request, res: Response) {
    const result = await automationService.sendTest(req.params.id);
    return res.json(result);
  },

  // Checagem diária de prazos de manutenção (chamada pelo cron externo).
  async runMaintenanceChecks(_req: Request, res: Response) {
    const result = await automationService.runMaintenanceChecks();
    return res.json(result);
  },
};
