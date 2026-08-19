import "dotenv/config";

// Centraliza a leitura de variáveis de ambiente num único lugar.
// Se faltar algo essencial, o app falha cedo com uma mensagem clara.
function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${key}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 3333),
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "1d",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  credentialsKey: required("CREDENTIALS_KEY"),

  // SMTP (Outlook/Office 365) para as automações enviarem e-mail. Opcional:
  // se não configurado, o envio é ignorado (a automação ainda registra na
  // auditoria). Preencher no EasyPanel quando for pra valer.
  // Ex.: SMTP_HOST=smtp.office365.com  SMTP_PORT=587  SMTP_SECURE=false
  smtp: {
    host: process.env.SMTP_HOST ?? "",
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true", // true = porta 465
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "",
  },
};
