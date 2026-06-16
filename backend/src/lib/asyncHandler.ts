import { NextFunction, Request, Response } from "express";

// O Express 4 não captura erros lançados dentro de handlers assíncronos.
// Este wrapper encaminha qualquer erro (throw / promise rejeitada) para o
// middleware de erro via next(err). Envolva todo controller async com ele.
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
