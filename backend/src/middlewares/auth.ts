import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "../lib/AppError.js";
import { prisma } from "../lib/prisma.js";

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
// Também confirma que o usuário do token ainda existe (sessão válida) e usa
// o papel atual do banco — assim um token de usuário removido é rejeitado
// com 401 limpo, em vez de quebrar ações mais adiante.
export async function ensureAuth(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;
  if (!header) {
    return next(new AppError("Token não informado", 401));
  }

  const [, token] = header.split(" ");
  let payload: TokenPayload;
  try {
    payload = jwt.verify(token, env.jwtSecret) as TokenPayload;
  } catch {
    return next(new AppError("Token inválido ou expirado", 401));
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true },
    });
    if (!user) {
      return next(new AppError("Sessão inválida. Faça login novamente.", 401));
    }
    req.user = { sub: user.id, role: user.role };
    return next();
  } catch (err) {
    return next(err);
  }
}

// Exige que o usuário autenticado seja ADMIN. Use depois de ensureAuth.
export function ensureAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== "ADMIN") {
    throw new AppError("Acesso restrito a administradores", 403);
  }
  return next();
}
