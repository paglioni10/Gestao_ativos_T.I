import { Request, Response } from "express";
import { z } from "zod";
import { userService } from "./user.service.js";

const createSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  // E-mail é opcional (colaborador que não loga pode não ter). Se informado,
  // precisa ser válido. String vazia é tratada como "sem e-mail".
  email: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.string().email("E-mail inválido").optional()
  ),
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
      "DIRETORIA",
      "TRADE",
      "EDUCACIONAL",
      "FISCAL",
      "PRODUCAO_NAILS",
      "INSIDE_SALES",
      "COMEX",
    ],
    { required_error: "Setor é obrigatório", invalid_type_error: "Setor inválido" }
  ),
}).refine((data) => data.role !== "ADMIN" || !!data.email, {
  message: "E-mail é obrigatório para administradores",
  path: ["email"],
});

const resetPasswordSchema = z.object({
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

const importSchema = z.object({
  rows: z
    .array(
      z.object({
        name: z.string().optional(),
        email: z.string().optional(),
        jobTitle: z.string().optional(),
        sector: z.string().optional(),
        role: z.string().optional(),
        password: z.string().optional(),
      })
    )
    .min(1, "A planilha está vazia")
    .max(2000, "Limite de 2000 linhas por importação"),
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

  async importMany(req: Request, res: Response) {
    const { rows } = importSchema.parse(req.body);
    const report = await userService.importMany(rows, req.user!.sub);
    return res.json(report);
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
