import { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { AppError } from "../lib/AppError.js";

// Protege os endpoints de cron (checagens agendadas disparadas por um serviço
// externo, ex.: GitHub Actions). Em vez de JWT, exige um segredo compartilhado
// no header `x-cron-secret`, comparado com a env CRON_SECRET.
export function ensureCronSecret(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const provided = req.header("x-cron-secret");
  if (!env.cronSecret || provided !== env.cronSecret) {
    throw new AppError("Não autorizado", 401);
  }
  next();
}
