import { Request, Response } from "express";
import { z } from "zod";
import { equipmentTypeService } from "./equipmentType.service.js";

const createSchema = z.object({ name: z.string().min(2) });

export const equipmentTypeController = {
  async list(_req: Request, res: Response) {
    const types = await equipmentTypeService.list();
    return res.json(types);
  },

  async create(req: Request, res: Response) {
    const { name } = createSchema.parse(req.body);
    const type = await equipmentTypeService.create(name);
    return res.status(201).json(type);
  },
};
