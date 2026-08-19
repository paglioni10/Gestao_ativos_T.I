import { Request, Response } from "express";
import { z } from "zod";
import { automationService } from "./automation.service.js";

const createSchema = z.object({
  equipmentTypeId: z.string().uuid("Tipo de equipamento inválido"),
  threshold: z.coerce
    .number({ required_error: "Informe o limite" })
    .int("O limite deve ser um número inteiro")
    .min(0, "O limite não pode ser negativo"),
  recipient: z.string().email("E-mail do destinatário inválido"),
  name: z.string().min(2).optional(),
  active: z.boolean().optional(),
});

const updateSchema = z
  .object({
    threshold: z.coerce.number().int().min(0).optional(),
    recipient: z.string().email("E-mail do destinatário inválido").optional(),
    name: z.string().min(2).optional(),
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
};
