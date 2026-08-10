export type Sector =
  | "TI"
  | "MARKETING"
  | "COMERCIAL"
  | "NAILS"
  | "RH"
  | "FABRICA"
  | "FINANCEIRO"
  | "FATURAMENTO"
  | "DIRETORIA"
  | "TRADE";

// Ordem alfabética (pt-BR) dos rótulos.
export const SECTOR_OPTIONS: { value: Sector; label: string }[] = [
  { value: "COMERCIAL", label: "Comercial" },
  { value: "DIRETORIA", label: "Diretoria" },
  { value: "FABRICA", label: "Fábrica" },
  { value: "FATURAMENTO", label: "Faturamento" },
  { value: "FINANCEIRO", label: "Financeiro" },
  { value: "MARKETING", label: "Marketing" },
  { value: "NAILS", label: "Nails" },
  { value: "RH", label: "RH" },
  { value: "TI", label: "T.I" },
  { value: "TRADE", label: "Trade" },
];

export const SECTOR_LABEL: Record<Sector, string> = SECTOR_OPTIONS.reduce(
  (acc, o) => ({ ...acc, [o.value]: o.label }),
  {} as Record<Sector, string>
);
