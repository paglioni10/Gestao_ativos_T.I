import * as XLSX from "xlsx";
import { SECTOR_OPTIONS } from "./sectors";

export interface UserImportRow {
  name: string;
  email: string;
  jobTitle: string;
  sector: string;
  role: string;
  password: string;
}

function normHeader(s: string): string {
  return String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function findCol(headers: string[], aliases: string[]): number {
  return headers.findIndex((h) => aliases.includes(h));
}

// Lê um .xlsx ou .csv e devolve as linhas mapeadas para os campos de
// colaborador. O casamento é por cabeçalho (aceita variações de acento/caixa).
export async function parseUserSpreadsheet(file: File): Promise<UserImportRow[]> {
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
    email: findCol(headers, ["email", "e mail"]),
    jobTitle: findCol(headers, ["cargo", "funcao", "job title"]),
    sector: findCol(headers, ["setor", "sector"]),
    role: findCol(headers, ["papel", "perfil", "role"]),
    password: findCol(headers, ["senha", "password"]),
  };

  const cell = (row: unknown[], i: number) =>
    i >= 0 && row[i] != null ? String(row[i]).trim() : "";

  return aoa.slice(1).map((r) => {
    const row = r as unknown[];
    return {
      name: cell(row, idx.name),
      email: cell(row, idx.email),
      jobTitle: cell(row, idx.jobTitle),
      sector: cell(row, idx.sector),
      role: cell(row, idx.role),
      password: cell(row, idx.password),
    };
  });
}

// Gera e baixa a planilha-modelo de colaboradores, com aba de referência
// listando os setores válidos.
export function downloadUserModel(): void {
  const wb = XLSX.utils.book_new();

  const main = XLSX.utils.aoa_to_sheet([
    ["Nome", "Email", "Cargo", "Setor", "Papel", "Senha"],
    [
      "João da Silva",
      "joao.silva@americanburrs.com",
      "Analista de Suporte",
      "T.I",
      "Colaborador",
      "",
    ],
  ]);
  main["!cols"] = [
    { wch: 24 },
    { wch: 30 },
    { wch: 22 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, main, "Colaboradores");

  const ref = XLSX.utils.aoa_to_sheet([
    ["Setores válidos", "Papéis válidos", "Senha"],
    ["", "Administrador", "Se ficar vazia, usa o padrão American@!"],
    ["", "Colaborador", ""],
    ...SECTOR_OPTIONS.map((s, i) => {
      const row: string[] = [s.label];
      if (i === 0) row[1] = "";
      return row;
    }),
  ]);
  ref["!cols"] = [{ wch: 18 }, { wch: 18 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, ref, "Referência");

  XLSX.writeFile(wb, "modelo-colaboradores.xlsx");
}
