import { Request, Response } from "express";
import { z } from "zod";
import { equipmentService } from "./equipment.service.js";

const createSchema = z.object({
  name: z.string().min(2),
  type: z.enum([
    "NOTEBOOK",
    "DESKTOP",
    "MONITOR",
    "PHONE",
    "PERIPHERAL",
    "TOOL",
    "OTHER",
  ]),
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

const listQuerySchema = z.object({
  status: z
    .enum(["AVAILABLE", "ASSIGNED", "MAINTENANCE", "RETIRED"])
    .optional(),
});

export const equipmentController = {
  async list(req: Request, res: Response) {
    const { status } = listQuerySchema.parse(req.query);
    const equipment = await equipmentService.list(status);
    return res.json(equipment);
  },

  async getById(req: Request, res: Response) {
    const equipment = await equipmentService.getById(req.params.id);
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
};
