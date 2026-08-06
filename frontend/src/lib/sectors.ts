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

export const SECTOR_OPTIONS: { value: Sector; label: string }[] = [
  { value: "TI", label: "T.I" },
  { value: "MARKETING", label: "Marketing" },
  { value: "COMERCIAL", label: "Comercial" },
  { value: "NAILS", label: "Nails" },
  { value: "RH", label: "RH" },
  { value: "FABRICA", label: "Fábrica" },
  { value: "FINANCEIRO", label: "Financeiro" },
  { value: "FATURAMENTO", label: "Faturamento" },
  { value: "DIRETORIA", label: "Diretoria" },
  { value: "TRADE", label: "Trade" },
];

export const SECTOR_LABEL: Record<Sector, string> = SECTOR_OPTIONS.reduce(
  (acc, o) => ({ ...acc, [o.value]: o.label }),
  {} as Record<Sector, string>
);
