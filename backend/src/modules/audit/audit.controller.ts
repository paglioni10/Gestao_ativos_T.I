import { Request, Response } from "express";
import { auditService } from "./audit.service.js";

export const auditController = {
  async list(_req: Request, res: Response) {
    const logs = await auditService.list();
    return res.json(logs);
  },
};
