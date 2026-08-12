import { Request, Response } from "express";
import { z } from "zod";
import { userService } from "./user.service.js";

const createSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  role: z.enum(["ADMIN", "COLLABORATOR"]),
  jobTitle: z
    .string({ required_error: "Cargo é obrigatório" })
    .min(2, "Cargo deve ter no mínimo 2 caracteres"),
  sector: z.enum(
    [
      "TI",
      "MARKETING",
      "COMERCIAL",
      "NAILS",
      "RH",
      "PRODUCAO_AB",
      "FINANCEIRO",
      "FATURAMENTO",
      "DIRETORIA",
      "TRADE",
      "EDUCACIONAL",
      "FISCAL",
      "PRODUCAO_NAILS",
    ],
    { required_error: "Setor é obrigatório", invalid_type_error: "Setor inválido" }
  ),
});

const resetPasswordSchema = z.object({
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

export const userController = {
  async list(_req: Request, res: Response) {
    const users = await userService.list();
    return res.json(users);
  },

  async create(req: Request, res: Response) {
    const data = createSchema.parse(req.body);
    const user = await userService.create(data, req.user!.sub);
    return res.status(201).json(user);
  },

  async resetPassword(req: Request, res: Response) {
    const { password } = resetPasswordSchema.parse(req.body);
    await userService.resetPassword(req.params.id, password, req.user!.sub);
    return res.status(204).send();
  },

  async remove(req: Request, res: Response) {
    await userService.remove(req.params.id, req.user!.sub);
    return res.status(204).send();
  },
};
