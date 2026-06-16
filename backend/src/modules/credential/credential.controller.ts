import { Request, Response } from "express";
import { z } from "zod";
import { credentialService } from "./credential.service.js";

const createSchema = z.object({
  equipmentId: z.string().uuid(),
  label: z.string().min(2),
  username: z.string().optional(),
  secret: z.string().min(1),
});

const listQuerySchema = z.object({
  equipmentId: z.string().uuid(),
});

export const credentialController = {
  async list(req: Request, res: Response) {
    const { equipmentId } = listQuerySchema.parse(req.query);
    const credentials = await credentialService.listByEquipment(equipmentId);
    return res.json(credentials);
  },

  async create(req: Request, res: Response) {
    const data = createSchema.parse(req.body);
    const credential = await credentialService.create(data, req.user!.sub);
    return res.status(201).json(credential);
  },

  async reveal(req: Request, res: Response) {
    const result = await credentialService.reveal(req.params.id, req.user!.sub);
    return res.json(result);
  },

  async remove(req: Request, res: Response) {
    await credentialService.remove(req.params.id, req.user!.sub);
    return res.status(204).send();
  },
};
