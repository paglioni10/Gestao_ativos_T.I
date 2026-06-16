import type { ReactNode } from "react";

// Traduz códigos de status para tom de cor + rótulo em português.
const STATUS_MAP: Record<string, { tone: string; label: string }> = {
  AVAILABLE: { tone: "green", label: "Disponível" },
  ASSIGNED: { tone: "blue", label: "Atribuído" },
  MAINTENANCE: { tone: "amber", label: "Manutenção" },
  RETIRED: { tone: "gray", label: "Baixado" },
  ACTIVE: { tone: "blue", label: "Ativo" },
  RETURNED: { tone: "green", label: "Devolvido" },
  OVERDUE: { tone: "red", label: "Atrasado" },
};

interface Props {
  status?: string; // se informado, mapeia tom + rótulo automaticamente
  tone?: string; // sobrescreve o tom (green|blue|amber|red|gray)
  children?: ReactNode; // sobrescreve o texto exibido
}

export function Badge({ status, tone, children }: Props) {
  const conf = status ? STATUS_MAP[status] : undefined;
  const finalTone = tone ?? conf?.tone ?? "gray";
  const label = children ?? conf?.label ?? status;
  return <span className={`badge badge-${finalTone}`}>{label}</span>;
}
