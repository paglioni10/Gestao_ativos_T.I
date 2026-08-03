import { Request, Response } from "express";
import { z } from "zod";
import { authService } from "./auth.service.js";

// Schemas de validação da entrada (zod). Garante que o body chega no formato certo.
const registerSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  role: z.enum(["ADMIN", "COLLABORATOR"]).optional(),
});

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("E-mail inválido"),
});

export const authController = {
  async register(req: Request, res: Response) {
    const data = registerSchema.parse(req.body);
    const result = await authService.register(data);
    return res.status(201).json(result);
  },

  async login(req: Request, res: Response) {
    const data = loginSchema.parse(req.body);
    const result = await authService.login(data);
    return res.json(result);
  },

  async forgotPassword(req: Request, res: Response) {
    const { email } = forgotPasswordSchema.parse(req.body);
    await authService.forgotPassword(email);
    // Mensagem genérica, sempre a mesma, exista ou não o e-mail.
    return res.json({
      message:
        "Se o e-mail existir, o administrador foi notificado e entrará em contato com uma nova senha.",
    });
  },
};
