import { createWriteStream, mkdirSync } from "node:fs";
import { join } from "node:path";
import PDFDocument from "pdfkit";

// Pasta onde os termos gerados ficam salvos (ignorada pelo git).
const UPLOADS_DIR = join(process.cwd(), "uploads");

interface TermData {
  assignmentId: string;
  equipmentName: string;
  equipmentSerial: string;
  receiverName: string;
  assignedAt: Date;
  signatureHash?: string;
  signatureDataUrl?: string; // imagem da assinatura em base64 (data URL)
}

// Gera o PDF do termo de responsabilidade e devolve o caminho relativo do arquivo.
export async function generateTermPdf(data: TermData): Promise<string> {
  mkdirSync(UPLOADS_DIR, { recursive: true });
  const fileName = `termo-${data.assignmentId}.pdf`;
  const filePath = join(UPLOADS_DIR, fileName);

  const doc = new PDFDocument({ margin: 50 });
  const stream = createWriteStream(filePath);
  doc.pipe(stream);

  doc.fontSize(18).text("Termo de Responsabilidade", { align: "center" });
  doc.moveDown();

  doc
    .fontSize(12)
    .text(
      "Declaro ter recebido o equipamento descrito abaixo, comprometendo-me a " +
        "zelar por sua guarda e conservação e a devolvê-lo quando solicitado."
    );
  doc.moveDown();

  doc.text(`Equipamento: ${data.equipmentName}`);
  doc.text(`Número de série: ${data.equipmentSerial}`);
  doc.text(`Colaborador: ${data.receiverName}`);
  doc.text(`Data da entrega: ${data.assignedAt.toLocaleString("pt-BR")}`);
  doc.moveDown(2);

  // Se houver assinatura, embute a imagem no documento.
  if (data.signatureDataUrl) {
    try {
      const base64 = data.signatureDataUrl.split(",")[1] ?? "";
      const img = Buffer.from(base64, "base64");
      doc.text("Assinatura do colaborador:");
      doc.image(img, { width: 200 });
    } catch {
      // Se a imagem vier inválida, apenas ignora — o termo ainda é gerado.
    }
  }

  doc.moveDown();
  if (data.signatureHash) {
    doc
      .fontSize(8)
      .fillColor("#888888")
      .text(`Hash de integridade (SHA-256): ${data.signatureHash}`);
  }

  doc.end();

  // O PDFKit escreve de forma assíncrona; esperamos o arquivo ser finalizado.
  await new Promise<void>((resolve, reject) => {
    stream.on("finish", () => resolve());
    stream.on("error", reject);
  });

  return `uploads/${fileName}`;
}
