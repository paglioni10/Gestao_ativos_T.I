import { Request, Response } from "express";
import { z } from "zod";
import { equipmentService } from "./equipment.service.js";

const createSchema = z.object({
  name: z.string().min(2),
  typeId: z.string().uuid(),
  serialNumber: z.string().min(1),
  purchaseDate: z.coerce.date().optional(),
  warrantyUntil: z.coerce.date().optional(),
  notes: z.string().optional(),
});

// Na edição todos os campos são opcionais (envia só o que mudou), mas o body
// precisa ter pelo menos um campo.
const updateSchema = createSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "Informe ao menos um campo para atualizar" }
);

const hardRemoveSchema = z.object({
  reason: z
    .string({ required_error: "Motivo da exclusão é obrigatório" })
    .trim()
    .min(3, "Descreva o motivo da exclusão (mínimo 3 caracteres)"),
});

const listQuerySchema = z.object({
  status: z
    .enum(["AVAILABLE", "ASSIGNED", "MAINTENANCE", "RETIRED"])
    .optional(),
  typeId: z.string().uuid().optional(),
});

export const equipmentController = {
  async list(req: Request, res: Response) {
    const { status, typeId } = listQuerySchema.parse(req.query);
    const equipment = await equipmentService.list(status, typeId);
    return res.json(equipment);
  },

  async getById(req: Request, res: Response) {
    const equipment = await equipmentService.getById(req.params.id);
    return res.json(equipment);
  },

  async qrCode(req: Request, res: Response) {
    const result = await equipmentService.getQrCode(req.params.id);
    return res.json(result);
  },

  // Ficha pública (sem autenticação) — ver equipmentService.getPublicById.
  async publicById(req: Request, res: Response) {
    const equipment = await equipmentService.getPublicById(req.params.id);
    return res.json(equipment);
  },

  async create(req: Request, res: Response) {
    const data = createSchema.parse(req.body);
    const equipment = await equipmentService.create(data, req.user!.sub);
    return res.status(201).json(equipment);
  },

  async update(req: Request, res: Response) {
    const data = updateSchema.parse(req.body);
    const equipment = await equipmentService.update(
      req.params.id,
      data,
      req.user!.sub
    );
    return res.json(equipment);
  },

  async remove(req: Request, res: Response) {
    const equipment = await equipmentService.remove(req.params.id, req.user!.sub);
    return res.json(equipment);
  },

  async hardRemove(req: Request, res: Response) {
    const { reason } = hardRemoveSchema.parse(req.body);
    await equipmentService.hardDelete(req.params.id, req.user!.sub, reason);
    return res.status(204).send();
  },
};
