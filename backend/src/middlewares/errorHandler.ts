import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../lib/AppError.js";

// Middleware de erro: deve ser o ÚLTIMO registrado no app.
// Converte erros conhecidos em respostas JSON padronizadas.
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  if (err instanceof ZodError) {
    return res.status(422).json({
      message: "Dados inválidos",
      issues: err.flatten().fieldErrors,
    });
  }

  console.error(err);
  return res.status(500).json({ message: "Erro interno do servidor" });
}
