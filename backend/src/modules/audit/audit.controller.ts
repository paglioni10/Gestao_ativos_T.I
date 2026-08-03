import { Request, Response } from "express";
import { z } from "zod";
import { auditService } from "./audit.service.js";

const listQuerySchema = z.object({
  typeId: z.string().uuid().optional(),
  period: z.enum(["week", "month", "semester", "year"]).optional(),
});

export const auditController = {
  async list(req: Request, res: Response) {
    const { typeId, period } = listQuerySchema.parse(req.query);
    const logs = await auditService.list(typeId, period);
    return res.json(logs);
  },
};
