import { createWriteStream, mkdirSync } from "node:fs";
import { join } from "node:path";
import PDFDocument from "pdfkit";

// Pasta onde os termos gerados ficam salvos (ignorada pelo git).
const UPLOADS_DIR = join(process.cwd(), "uploads");

interface TermItem {
  name: string;
  serialNumber: string;
}

interface TermData {
  assignmentId: string;
  receiverName: string;
  jobTitle?: string | null;
  items: TermItem[]; // todos os equipamentos atualmente com o colaborador
  assignedAt: Date;
}

// Cláusulas do termo, na mesma ordem e redação do modelo usado pela empresa.
const CLAUSES = [
  "No caso de rescisão definitiva do meu vínculo empregatício, comprometo-me a " +
    "restituir integralmente todos os bens materiais disponibilizados em regime de " +
    "comodato para o desempenho das minhas atribuições profissionais, reconhecendo a " +
    "exclusiva propriedade da empresa sobre eles.",
  "Em situações de perda, assumo o compromisso de comunicar de imediato o ocorrido " +
    "ao setor competente, procedendo com o registro de Boletim de Ocorrência, a fim de " +
    "resguardar os interesses da empresa e mitigar eventuais danos decorrentes da " +
    "indisponibilidade dos referidos itens.",
  "Comprometo-me a esforçar-me pela adequada preservação dos mencionados bens, " +
    "responsabilizando-me por sua conservação durante o período de utilização no " +
    "exercício das minhas funções. No caso de término do contrato de trabalho, " +
    "comprometo-me a restituir todos os itens, sob pena de sujeição a descontos em " +
    "eventual rescisão contratual, visando assegurar a integridade do patrimônio da empresa.",
];

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// Formata como no modelo: "6 de Agosto de 2026" (dia sem zero à esquerda,
// mês com inicial maiúscula).
function formatSignatureDate(date: Date): string {
  return `${date.getDate()} de ${MONTHS[date.getMonth()]} de ${date.getFullYear()}`;
}

// Gera o PDF da declaração de responsabilidade e devolve o caminho relativo
// do arquivo. Segue o modelo de documento já usado pela empresa.
export async function generateTermPdf(data: TermData): Promise<string> {
  mkdirSync(UPLOADS_DIR, { recursive: true });
  const fileName = `termo-${data.assignmentId}.pdf`;
  const filePath = join(UPLOADS_DIR, fileName);

  const doc = new PDFDocument({ margin: 56, size: "A4" });
  const stream = createWriteStream(filePath);
  doc.pipe(stream);

  const text = "#1a1a1a";

  // ---- Título ----------------------------------------------------------
  doc
    .font("Helvetica-Bold")
    .fontSize(18)
    .fillColor(text)
    .text("DECLARAÇÃO DE RESPONSABILIDADE", { align: "center" });
  doc.moveDown(1.5);

  // ---- Corpo principal ---------------------------------------------------
  doc.font("Helvetica").fontSize(11).fillColor(text);
  doc.text(
    `Eu, ${data.receiverName}, declaro que todos os itens especificados e entregues ` +
      "nesta ficha foram entregues em forma de comodato para o exercício da minha " +
      `função ${data.jobTitle ?? "—"}, sendo os mesmo de exclusiva propriedade da ` +
      "empresa, bem como seu uso no exercício de minhas atividades, comprometendo-me " +
      "a respeitar e cumprir o que segue abaixo:",
    { align: "justify" }
  );
  doc.moveDown(1);

  // ---- Cláusulas (sem numeração, como no modelo) --------------------------
  CLAUSES.forEach((clause) => {
    doc.text(clause, { align: "justify" });
    doc.moveDown(0.8);
  });

  // ---- RELAÇÃO -------------------------------------------------------------
  doc.moveDown(0.4);
  doc.text("RELAÇÃO");
  doc.moveDown(0.3);
  data.items.forEach((item) => {
    doc.text(`${item.name};`);
  });
  doc.moveDown(1);

  // ---- PATRIMONIO ------------------------------------------------------------
  const serials = data.items.map((i) => i.serialNumber).join(", ");
  doc.text(`PATRIMONIO: ${serials}`);
  doc.moveDown(1.5);

  // ---- Local e data ----------------------------------------------------------
  doc.text(`Palhoça, ${formatSignatureDate(data.assignedAt)}`);

  doc.end();

  // O PDFKit escreve de forma assíncrona; esperamos o arquivo ser finalizado.
  await new Promise<void>((resolve, reject) => {
    stream.on("finish", () => resolve());
    stream.on("error", reject);
  });

  return `uploads/${fileName}`;
}
