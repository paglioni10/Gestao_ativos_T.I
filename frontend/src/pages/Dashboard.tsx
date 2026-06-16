import { useEffect, useState } from "react";
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

  return (
    <div>
      <h1>Olá, {user?.name}</h1>
      <p className="muted">Visão geral dos ativos</p>

      {summary ? (
        <div className="stat-grid" style={{ marginTop: 20 }}>
          <Stat label="Disponíveis" value={summary.equipmentByStatus.AVAILABLE ?? 0} />
          <Stat label="Atribuídos agora" value={summary.activeAssignments} />
          <Stat label="Em manutenção" value={summary.equipmentByStatus.MAINTENANCE ?? 0} />
          <Stat label="Manutenções próximas" value={summary.upcomingMaintenance} />
          <Stat
            label="Manutenções atrasadas"
            value={summary.overdueMaintenance}
            alert={summary.overdueMaintenance > 0}
          />
          <Stat
            label="Atribuições atrasadas"
            value={summary.overdueAssignments}
            alert={summary.overdueAssignments > 0}
          />
        </div>
      ) : (
        <p className="muted">Carregando métricas...</p>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  alert = false,
}: {
  label: string;
  value: number;
  alert?: boolean;
}) {
  return (
    <div className={`stat-card${alert ? " alert" : ""}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
