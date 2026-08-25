import { lookup } from "node:dns/promises";
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

async function getTransporter(): Promise<Transporter> {
  if (!transporter) {
    // Resolve o host para um endereço IPv4 explicitamente e conecta nele.
    // Motivo: ambientes como o Render não têm saída IPv6, e o nodemailer
    // pode escolher o IPv6 do smtp.office365.com -> ENETUNREACH. Usar o IP
    // v4 direto elimina isso; o `servername` mantém a validação do
    // certificado TLS pelo nome original do host.
    let host = env.smtp.host;
    try {
      const res = await lookup(env.smtp.host, { family: 4 });
      host = res.address;
    } catch {
      // Se a resolução falhar, cai no hostname original.
    }

    const options: SMTPTransport.Options & { family?: number } = {
      host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
      family: 4,
      tls: { servername: env.smtp.host },
      // Timeouts curtos: o backend responde rápido com um erro claro em vez
      // de pendurar (o que faz o gateway devolver 502/HTML sem mensagem).
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 10000,
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
  const tx = await getTransporter();
  try {
    await tx.sendMail({
      from: env.smtp.from || env.smtp.user,
      to,
      subject,
      text: text ?? html.replace(/<[^>]+>/g, " "),
      html,
    });
  } catch (err) {
    // Log detalhado no servidor (aparece nos Logs do Render) para diagnóstico.
    console.error(`[mailer] falha ao enviar para "${to}":`, err);
    throw err;
  }
  return { sent: true };
}
