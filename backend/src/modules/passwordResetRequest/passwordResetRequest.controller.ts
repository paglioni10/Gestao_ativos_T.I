import { Request, Response } from "express";
import { z } from "zod";
import { passwordResetRequestService } from "./passwordResetRequest.service.js";

const resolveSchema = z.object({
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

export const passwordResetRequestController = {
  async list(_req: Request, res: Response) {
    const requests = await passwordResetRequestService.listAll();
    return res.json(requests);
  },

  async resolve(req: Request, res: Response) {
    const { password } = resolveSchema.parse(req.body);
    await passwordResetRequestService.resolve(
      req.params.id,
      password,
      req.user!.sub
    );
    return res.status(204).send();
  },
};
