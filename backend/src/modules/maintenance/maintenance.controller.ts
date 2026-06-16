import { Request, Response } from "express";
import { z } from "zod";
import { maintenanceService } from "./maintenance.service.js";

const createSchema = z.object({
  equipmentId: z.string().uuid(),
  description: z.string().min(2),
  scheduledFor: z.coerce.date(),
});

export const maintenanceController = {
  async list(_req: Request, res: Response) {
    const records = await maintenanceService.list();
    return res.json(records);
  },

  async create(req: Request, res: Response) {
    const data = createSchema.parse(req.body);
    const record = await maintenanceService.create(data, req.user!.sub);
    return res.status(201).json(record);
  },

  async complete(req: Request, res: Response) {
    const record = await maintenanceService.complete(req.params.id, req.user!.sub);
    return res.json(record);
  },
};
