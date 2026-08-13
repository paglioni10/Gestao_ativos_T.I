import * as XLSX from "xlsx";

// Decodifica o conteúdo de um CSV lidando com a codificação: arquivos gerados
// pelo Excel no Brasil normalmente vêm em Windows-1252 (não UTF-8), o que
// corrompe acentos. Tentamos UTF-8; se aparecer o caractere de substituição
// (), refazemos em Windows-1252.
function decodeCsv(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder("utf-8").decode(buf); // BOM UTF-8
  }
  const utf8 = new TextDecoder("utf-8").decode(buf);
  if (!utf8.includes("�")) return utf8;
  return new TextDecoder("windows-1252").decode(buf);
}

// Lê a primeira aba de um .xlsx/.csv e devolve as linhas como matriz (a
// primeira linha é o cabeçalho). Trata a codificação do CSV.
export async function readSheetAoa(file: File): Promise<unknown[][]> {
  const buf = await file.arrayBuffer();
  const isCsv = /\.csv$/i.test(file.name) || file.type === "text/csv";
  const wb = isCsv
    ? XLSX.read(decodeCsv(buf), { type: "string" })
    : XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    blankrows: false,
    defval: "",
  });
}

// Normaliza texto de cabeçalho: minúsculo, sem acento, só letras/números.
export function normHeader(s: string): string {
  return String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Acha o índice da coluna cujo cabeçalho casa com um dos apelidos (exato ou
// por conter o apelido — ex.: "nome completo" casa com "nome").
export function findCol(headers: string[], aliases: string[]): number {
  const exact = headers.findIndex((h) => aliases.includes(h));
  if (exact >= 0) return exact;
  return headers.findIndex((h) =>
    aliases.some((a) => h === a || h.split(" ").includes(a))
  );
}
