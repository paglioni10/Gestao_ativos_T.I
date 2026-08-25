import nodemailer, { Transporter } from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport/index.js";
import { env } from "../config/env.js";

// Envio de e-mail para as automações. É opcional por design: se o SMTP não
// estiver configurado (variáveis SMTP_*), o envio é ignorado e a chamada
// apenas devolve `sent: false` — assim o sistema funciona no ambiente atual
// sem quebrar, e passa a enviar de verdade quando as variáveis forem
// preenchidas (ex.: no EasyPanel com a conta Outlook da empresa).

let transporter: Transporter | null = null;

export function isMailConfigured(): boolean {
  return Boolean(env.smtp.host && env.smtp.user && env.smtp.pass);
}

function getTransporter(): Transporter {
  if (!transporter) {
    // `family` é aceito em runtime (repassado ao socket), mas não consta no
    // tipo desta versão do nodemailer — por isso a intersecção.
    const options: SMTPTransport.Options & { family?: number } = {
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
      // Força IPv4: alguns hosts (ex.: Render) não têm saída IPv6, e o Node
      // pode tentar o IPv6 do smtp.office365.com primeiro -> ENETUNREACH.
      family: 4,
      // Timeouts curtos para não travar a requisição (ex.: atribuição) se o
      // servidor SMTP não responder ou recusar a conexão/autenticação.
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      // Office 365 usa STARTTLS na porta 587 (secure=false).
      requireTLS: env.smtp.port === 587 && !env.smtp.secure,
    };
    transporter = nodemailer.createTransport(options);
  }
  return transporter;
}

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Retorna { sent } — sent=false quando não há SMTP configurado (não é erro).
export async function sendMail({
  to,
  subject,
  html,
  text,
}: SendMailInput): Promise<{ sent: boolean }> {
  if (!isMailConfigured()) {
    console.warn(
      `[mailer] SMTP não configurado — e-mail para "${to}" não enviado (assunto: ${subject}).`
    );
    return { sent: false };
  }
  await getTransporter().sendMail({
    from: env.smtp.from || env.smtp.user,
    to,
    subject,
    text: text ?? html.replace(/<[^>]+>/g, " "),
    html,
  });
  return { sent: true };
}
