import { createWriteStream, mkdirSync } from "node:fs";
import { join } from "node:path";
import PDFDocument from "pdfkit";

// Pasta onde os termos gerados ficam salvos (ignorada pelo git).
const UPLOADS_DIR = join(process.cwd(), "uploads");

interface TermData {
  assignmentId: string;
  equipmentName: string;
  equipmentType?: string;
  equipmentSerial: string;
  receiverName: string;
  assignedAt: Date;
  signatureHash?: string;
  signatureDataUrl?: string; // imagem da assinatura em base64 (data URL)
}

// Cláusulas do termo de responsabilidade.
const CLAUSES = [
  "Comprometo-me a esforçar-me pela adequada preservação dos mencionados bens, " +
    "responsabilizando-me por sua conservação durante o período de utilização no " +
    "exercício das minhas funções. No caso de término do contrato de trabalho, " +
    "comprometo-me a restituir todos os itens, sob pena de sujeição a descontos em " +
    "eventual rescisão contratual, visando assegurar a integridade do patrimônio da empresa.",
  "Em situações de perda, assumo o compromisso de comunicar de imediato o ocorrido " +
    "ao setor competente, procedendo com o registro de Boletim de Ocorrência, a fim de " +
    "resguardar os interesses da empresa e mitigar eventuais danos decorrentes da " +
    "indisponibilidade dos referidos itens.",
  "No caso de rescisão definitiva do meu vínculo empregatício, comprometo-me a " +
    "restituir integralmente todos os bens materiais disponibilizados em regime de " +
    "comodato para o desempenho das minhas atribuições profissionais, reconhecendo a " +
    "exclusiva propriedade da empresa sobre eles.",
];

// Formata uma data como "16 de junho de 2026".
function formatLongDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// Gera o PDF do termo de responsabilidade e devolve o caminho relativo do arquivo.
export async function generateTermPdf(data: TermData): Promise<string> {
  mkdirSync(UPLOADS_DIR, { recursive: true });
  const fileName = `termo-${data.assignmentId}.pdf`;
  const filePath = join(UPLOADS_DIR, fileName);

  const doc = new PDFDocument({ margin: 56, size: "A4" });
  const stream = createWriteStream(filePath);
  doc.pipe(stream);

  const accent = "#1a1a1a";
  const muted = "#666666";
  const contentWidth =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;

  // ---- Cabeçalho -----------------------------------------------------------
  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .fillColor(accent)
    .text("TERMO DE RESPONSABILIDADE", { align: "center" });
  doc
    .font("Helvetica")
    .fontSize(11)
    .fillColor(muted)
    .text("Uso e guarda de equipamento corporativo", { align: "center" });
  doc.moveDown(0.5);

  // Linha divisória
  const lineY = doc.y;
  doc
    .moveTo(doc.page.margins.left, lineY)
    .lineTo(doc.page.width - doc.page.margins.right, lineY)
    .strokeColor("#dddddd")
    .stroke();
  doc.moveDown(1);

  // ---- Introdução ----------------------------------------------------------
  doc.font("Helvetica").fontSize(11).fillColor(accent);
  doc.text(
    `Pelo presente instrumento, eu, ${data.receiverName}, declaro, para os devidos ` +
      "fins, ter recebido da empresa, em regime de comodato, o equipamento abaixo " +
      "identificado, destinado exclusivamente ao desempenho das minhas atribuições " +
      "profissionais:",
    { align: "justify" }
  );
  doc.moveDown(1);

  // ---- Identificação do equipamento ---------------------------------------
  doc.font("Helvetica-Bold").fontSize(12).text("Identificação do equipamento");
  doc.moveDown(0.4);
  doc.font("Helvetica").fontSize(11);

  const rows: [string, string][] = [
    ["Equipamento", data.equipmentName],
    ["Tipo", data.equipmentType ?? "—"],
    ["Número de série", data.equipmentSerial],
    ["Data da entrega", formatLongDate(data.assignedAt)],
  ];
  for (const [label, value] of rows) {
    doc
      .font("Helvetica-Bold")
      .text(`${label}: `, { continued: true })
      .font("Helvetica")
      .text(value);
  }
  doc.moveDown(1);

  // ---- Cláusulas -----------------------------------------------------------
  doc.font("Helvetica-Bold").fontSize(12).text("Cláusulas");
  doc.moveDown(0.4);
  doc.font("Helvetica").fontSize(11);
  CLAUSES.forEach((clause, i) => {
    doc.text(`${i + 1}. ${clause}`, { align: "justify" });
    doc.moveDown(0.6);
  });
  doc.moveDown(0.5);
  doc.text(
    "Declaro estar ciente e de acordo com todas as condições acima estabelecidas.",
    { align: "justify" }
  );
  doc.moveDown(2);

  // ---- Assinatura ----------------------------------------------------------
  if (data.signatureDataUrl) {
    try {
      const base64 = data.signatureDataUrl.split(",")[1] ?? "";
      const img = Buffer.from(base64, "base64");
      doc.image(img, doc.page.margins.left, doc.y, { width: 180 });
      doc.moveDown(0.5);
    } catch {
      // Assinatura inválida: segue sem a imagem, mantendo a linha abaixo.
    }
  }

  // Linha de assinatura + nome
  const signLineY = doc.y + 6;
  doc
    .moveTo(doc.page.margins.left, signLineY)
    .lineTo(doc.page.margins.left + 260, signLineY)
    .strokeColor("#999999")
    .stroke();
  doc.moveDown(0.6);
  doc.font("Helvetica-Bold").fontSize(11).fillColor(accent).text(data.receiverName);
  doc.font("Helvetica").fontSize(10).fillColor(muted).text("Assinatura do colaborador");

  // ---- Rodapé: integridade -------------------------------------------------
  doc.moveDown(2);
  doc
    .fontSize(8)
    .fillColor(muted)
    .text(
      `Documento gerado eletronicamente em ${data.assignedAt.toLocaleString("pt-BR")}.`,
      { align: "left" }
    );
  if (data.signatureHash) {
    doc.text(`Hash de integridade (SHA-256): ${data.signatureHash}`, {
      width: contentWidth,
    });
  }

  doc.end();

  // O PDFKit escreve de forma assíncrona; esperamos o arquivo ser finalizado.
  await new Promise<void>((resolve, reject) => {
    stream.on("finish", () => resolve());
    stream.on("error", reject);
  });

  return `uploads/${fileName}`;
}
