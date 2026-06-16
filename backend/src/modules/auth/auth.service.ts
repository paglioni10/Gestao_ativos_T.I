import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { AppError } from "../../lib/AppError.js";
import { prisma } from "../../lib/prisma.js";
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

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, passwordHash, role: role ?? "COLLABORATOR" },
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

  // Monta a resposta padrão: dados públicos do usuário + token assinado.
  toAuthResponse(id: string, name: string, email: string, role: Role) {
    const token = jwt.sign({ sub: id, role }, env.jwtSecret, {
      expiresIn: env.jwtExpiresIn,
    } as jwt.SignOptions);

    return { user: { id, name, email, role }, token };
  },
};
