import { ReactNode, useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";

interface Summary {
  equipmentByStatus: Record<string, number>;
  activeAssignments: number;
  overdueAssignments: number;
  upcomingMaintenance: number;
  overdueMaintenance: number;
}

// Tela inicial com os números-resumo vindos de /dashboard/summary.
export function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    api
      .get<Summary>("/dashboard/summary")
      .then((res) => setSummary(res.data))
      .catch(() => setSummary(null));
  }, []);

  if (!summary) {
    return (
      <div>
        <h1>Olá, {user?.name}</h1>
        <p className="muted">Carregando métricas...</p>
      </div>
    );
  }

  const eq = summary.equipmentByStatus;
  const available = eq.AVAILABLE ?? 0;
  const assigned = eq.ASSIGNED ?? 0;
  const maintenance = eq.MAINTENANCE ?? 0;
  const retired = eq.RETIRED ?? 0;
  const total = available + assigned + maintenance + retired;
  const availablePct = total > 0 ? Math.round((available / total) * 100) : 0;

  return (
    <div>
      <h1>Olá, {user?.name}</h1>
      <p className="muted">Visão geral dos ativos</p>

      <div className="stat-grid" style={{ marginTop: 20 }}>
        <Stat
          icon="📦"
          tone="blue"
          value={total}
          label="Total de equipamentos"
          detail={`${available} disponíveis · ${assigned} em uso`}
        />
        <Stat
          icon="✅"
          tone="green"
          value={available}
          label="Disponíveis"
          detail={`${availablePct}% do inventário prontos para entrega`}
        />
        <Stat
          icon="👥"
          tone="blue"
          value={summary.activeAssignments}
          label="Atribuídos agora"
          detail="em poder de colaboradores"
        />
        <Stat
          icon="🔧"
          tone="amber"
          value={maintenance}
          label="Em manutenção"
          detail={`${summary.upcomingMaintenance} manutenção(ões) agendada(s)`}
        />
        <Stat
          icon="⚠️"
          tone="red"
          value={summary.overdueMaintenance}
          label="Manutenções atrasadas"
          detail="requerem atenção imediata"
          alert={summary.overdueMaintenance > 0}
        />
        <Stat
          icon="⏰"
          tone="red"
          value={summary.overdueAssignments}
          label="Atribuições atrasadas"
          detail="devolução pendente"
          alert={summary.overdueAssignments > 0}
        />
      </div>
    </div>
  );
}

function Stat({
  icon,
  value,
  label,
  detail,
  tone = "gray",
  alert = false,
}: {
  icon: ReactNode;
  value: number;
  label: string;
  detail?: string;
  tone?: string;
  alert?: boolean;
}) {
  return (
    <div className={`stat-card${alert ? " alert" : ""}`}>
      <div className={`stat-icon tone-${tone}`}>{icon}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {detail && <div className="stat-detail">{detail}</div>}
    </div>
  );
}
