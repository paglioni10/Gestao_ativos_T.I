import * as XLSX from "xlsx";

export interface ImportRow {
  name: string;
  type: string;
  serialNumber: string;
  notes: string;
}

// Normaliza texto de cabeçalho: minúsculo, sem acento, só letras/números.
function normHeader(s: string): string {
  return String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Acha o índice da coluna cujo cabeçalho casa com um dos apelidos.
function findCol(headers: string[], aliases: string[]): number {
  return headers.findIndex((h) => aliases.includes(h));
}

// Lê um arquivo .xlsx ou .csv e devolve as linhas mapeadas para os campos
// esperados. O casamento é por cabeçalho (aceita variações de acento/caixa).
export async function parseSpreadsheet(file: File): Promise<ImportRow[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return [];

  const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    blankrows: false,
    defval: "",
  });
  if (aoa.length === 0) return [];

  const headers = (aoa[0] as unknown[]).map((h) => normHeader(String(h)));
  const idx = {
    name: findCol(headers, ["nome", "name"]),
    type: findCol(headers, ["tipo", "type"]),
    serial: findCol(headers, [
      "n de serie",
      "no de serie",
      "numero de serie",
      "serie",
      "serial",
      "n serie",
    ]),
    notes: findCol(headers, ["obs", "observacao", "observacoes", "notes"]),
  };

  const cell = (row: unknown[], i: number) =>
    i >= 0 && row[i] != null ? String(row[i]).trim() : "";

  return aoa.slice(1).map((r) => {
    const row = r as unknown[];
    return {
      name: cell(row, idx.name),
      type: cell(row, idx.type),
      serialNumber: cell(row, idx.serial),
      notes: cell(row, idx.notes),
    };
  });
}

// Gera e baixa uma planilha-modelo (.xlsx) com o cabeçalho esperado, uma
// linha de exemplo e uma aba listando os tipos válidos (para consulta).
export function downloadModel(typeNames: string[]): void {
  const wb = XLSX.utils.book_new();

  const main = XLSX.utils.aoa_to_sheet([
    ["Nome", "Tipo", "Nº de série", "Obs"],
    ["Iphone 15", "Celular", "0061", "Capa azul"],
  ]);
  main["!cols"] = [{ wch: 24 }, { wch: 16 }, { wch: 16 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, main, "Equipamentos");

  const tipos = XLSX.utils.aoa_to_sheet([
    ["Tipos válidos (use exatamente estes nomes na coluna Tipo)"],
    ...typeNames.map((t) => [t]),
  ]);
  tipos["!cols"] = [{ wch: 48 }];
  XLSX.utils.book_append_sheet(wb, tipos, "Tipos");

  XLSX.writeFile(wb, "modelo-equipamentos.xlsx");
}
