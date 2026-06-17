import { Request, Response } from "express";
import { z } from "zod";
import { auditService } from "./audit.service.js";

const listQuerySchema = z.object({
  equipmentType: z
    .enum([
      "NOTEBOOK",
      "DESKTOP",
      "MONITOR",
      "PHONE",
      "PERIPHERAL",
      "TOOL",
      "OTHER",
    ])
    .optional(),
});

export const auditController = {
  async list(req: Request, res: Response) {
    const { equipmentType } = listQuerySchema.parse(req.query);
    const logs = await auditService.list(equipmentType);
    return res.json(logs);
  },
};
