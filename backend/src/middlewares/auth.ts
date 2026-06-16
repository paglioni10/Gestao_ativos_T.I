import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "../lib/AppError.js";

// Formato do payload que assinamos no JWT.
export interface TokenPayload {
  sub: string; // id do usuário
  role: "ADMIN" | "COLLABORATOR";
}

// Adiciona o usuário autenticado ao objeto Request (tipagem).
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

// Exige um token JWT válido no header Authorization: Bearer <token>.
export function ensureAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header) {
    throw new AppError("Token não informado", 401);
  }

  const [, token] = header.split(" ");
  try {
    const payload = jwt.verify(token, env.jwtSecret) as TokenPayload;
    req.user = payload;
    return next();
  } catch {
    throw new AppError("Token inválido ou expirado", 401);
  }
}

// Exige que o usuário autenticado seja ADMIN. Use depois de ensureAuth.
export function ensureAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== "ADMIN") {
    throw new AppError("Acesso restrito a administradores", 403);
  }
  return next();
}
