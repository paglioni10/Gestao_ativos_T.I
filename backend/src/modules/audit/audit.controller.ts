import { Request, Response } from "express";
import { z } from "zod";
import { auditService } from "./audit.service.js";

const listQuerySchema = z.object({
  typeId: z.string().uuid().optional(),
});

export const auditController = {
  async list(req: Request, res: Response) {
    const { typeId } = listQuerySchema.parse(req.query);
    const logs = await auditService.list(typeId);
    return res.json(logs);
  },
};
