import { Request, Response } from "express";
import { assignmentService } from "./assignment.service.js";

export const assignmentController = {
  async list(_req: Request, res: Response) {
    const assignments = await assignmentService.list();
    return res.json(assignments);
  },

  // TODO: validar body com zod e chamar assignmentService.create
  async create(_req: Request, res: Response) {
    const result = await assignmentService.create();
    return res.status(201).json(result);
  },

  // TODO: chamar assignmentService.returnEquipment com o id da atribuição
  async returnEquipment(_req: Request, res: Response) {
    const result = await assignmentService.returnEquipment();
    return res.json(result);
  },
};
