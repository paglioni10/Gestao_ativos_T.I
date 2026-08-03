import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { AppError } from "../../lib/AppError.js";
import { prisma } from "../../lib/prisma.js";
import { passwordResetRequestService } from "../passwordResetRequest/passwordResetRequest.service.js";
import type { Role } from "@prisma/client";

interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role?: Role;
}

interface LoginInput {
  email: string;
  password: string;
}

export const authService = {
  // Cria um novo usuário com a senha já criptografada (nunca salve senha pura!).
  async register({ name, email, password, role }: RegisterInput) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError("E-mail já cadastrado");
    }

    // Governança: o registro público NUNCA cria administradores — sempre
    // COLLABORATOR. Contas de admin só são criadas por outro admin
    // (POST /api/users). Isso evita escalonamento de privilégio.
    void role;
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, passwordHash, role: "COLLABORATOR" },
    });

    return this.toAuthResponse(user.id, user.name, user.email, user.role);
  },

  // Valida credenciais e devolve um token JWT.
  async login({ email, password }: LoginInput) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError("Credenciais inválidas", 401);
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new AppError("Credenciais inválidas", 401);
    }

    return this.toAuthResponse(user.id, user.name, user.email, user.role);
  },

  // Solicita redefinição de senha. Não há envio de e-mail configurado no
  // projeto: o pedido aparece para o admin na seção Solicitações, que
  // define a nova senha diretamente ali e avisa a pessoa por fora (Teams,
  // presencial etc.). A resposta é sempre genérica — nunca revela se o
  // e-mail existe ou não (evita enumeração de contas).
  async forgotPassword(email: string) {
    await passwordResetRequestService.create(email);
  },

  // Monta a resposta padrão: dados públicos do usuário + token assinado.
  toAuthResponse(id: string, name: string, email: string, role: Role) {
    const token = jwt.sign({ sub: id, role }, env.jwtSecret, {
      expiresIn: env.jwtExpiresIn,
    } as jwt.SignOptions);

    return { user: { id, name, email, role }, token };
  },
};
