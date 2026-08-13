export type Sector =
  | "TI"
  | "MARKETING"
  | "COMERCIAL"
  | "NAILS"
  | "RH"
  | "PRODUCAO_AB"
  | "FINANCEIRO"
  | "FATURAMENTO"
  | "DIRETORIA"
  | "TRADE"
  | "EDUCACIONAL"
  | "FISCAL"
  | "PRODUCAO_NAILS"
  | "INSIDE_SALES"
  | "COMEX";

// Ordem alfabética (pt-BR) dos rótulos.
export const SECTOR_OPTIONS: { value: Sector; label: string }[] = [
  { value: "COMEX", label: "Comex" },
  { value: "DIRETORIA", label: "Diretoria" },
  { value: "EDUCACIONAL", label: "Educacional" },
  { value: "FATURAMENTO", label: "Faturamento" },
  { value: "COMERCIAL", label: "Field Sales" },
  { value: "FINANCEIRO", label: "Financeiro" },
  { value: "FISCAL", label: "Fiscal" },
  { value: "INSIDE_SALES", label: "Inside Sales" },
  { value: "MARKETING", label: "Marketing" },
  { value: "NAILS", label: "Nails" },
  { value: "PRODUCAO_AB", label: "Produção AB" },
  { value: "PRODUCAO_NAILS", label: "Produção Nails" },
  { value: "RH", label: "RH" },
  { value: "TI", label: "T.I" },
  { value: "TRADE", label: "Trade" },
];

export const SECTOR_LABEL: Record<Sector, string> = SECTOR_OPTIONS.reduce(
  (acc, o) => ({ ...acc, [o.value]: o.label }),
  {} as Record<Sector, string>
);
