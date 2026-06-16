// Erro de aplicação com status HTTP. Lançado nos services e tratado
// centralmente pelo middleware errorHandler.
export class AppError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.name = "AppError";
  }
}
