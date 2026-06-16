import { Request, Response } from "express";
import { z } from "zod";
import { assignmentService } from "./assignment.service.js";

const createSchema = z.object({
  equipmentId: z.string().uuid(),
  receiverId: z.string().uuid(),
  notes: z.string().optional(),
});

export const assignmentController = {
  async list(_req: Request, res: Response) {
    const assignments = await assignmentService.list();
    return res.json(assignments);
  },

  async create(req: Request, res: Response) {
    const data = createSchema.parse(req.body);
    const result = await assignmentService.create(data, req.user!.sub);
    return res.status(201).json(result);
  },

  async returnEquipment(req: Request, res: Response) {
    const result = await assignmentService.returnEquipment(
      req.params.id,
      req.user!.sub
    );
    return res.json(result);
  },
};
