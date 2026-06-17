import { Request, Response } from "express";
import { z } from "zod";
import { passwordRequestService } from "./passwordRequest.service.js";

const createSchema = z.object({
  equipmentId: z.string().uuid(),
  reason: z.string().optional(),
});

const resolveSchema = z.object({
  action: z.enum(["approve", "deny"]),
});

export const passwordRequestController = {
  async list(_req: Request, res: Response) {
    const requests = await passwordRequestService.listAll();
    return res.json(requests);
  },

  async mine(req: Request, res: Response) {
    const requests = await passwordRequestService.listMine(req.user!.sub);
    return res.json(requests);
  },

  async create(req: Request, res: Response) {
    const data = createSchema.parse(req.body);
    const request = await passwordRequestService.create(data, req.user!.sub);
    return res.status(201).json(request);
  },

  async resolve(req: Request, res: Response) {
    const { action } = resolveSchema.parse(req.body);
    const updated = await passwordRequestService.resolve(
      req.params.id,
      action,
      req.user!.sub
    );
    return res.json(updated);
  },

  async secrets(req: Request, res: Response) {
    const result = await passwordRequestService.viewSecrets(
      req.params.id,
      req.user!.sub
    );
    return res.json(result);
  },
};
