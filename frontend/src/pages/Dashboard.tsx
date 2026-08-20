import { ReactNode, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Spinner } from "../components/Spinner";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";

interface EquipmentRef {
  id: string;
  name: string;
  type: string;
  serialNumber: string | null;
  scheduledFor: string;
  daysLate?: number;
}

interface Summary {
  equipmentByStatus: Record<string, number>;
  activeAssignments: number;
  upcomingMaintenance: number;
  overdueMaintenance: number;
  maintenanceEquipment: EquipmentRef[];
  overdueEquipment: EquipmentRef[];
  availableByType: { type: string; count: number }[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

// Tela inicial com os números-resumo vindos de /dashboard/summary.
export function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [expanded, setExpanded] = useState<
    "available" | "maintenance" | "overdue" | null
  >(null);

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
        <p className="muted" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Spinner /> Carregando métricas...
        </p>
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

      <div className="stat-grid" style={{ marginTop: 20, alignItems: "start" }}>
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
          expandable
          expanded={expanded === "available"}
          onToggle={() => setExpanded((e) => (e === "available" ? null : "available"))}
        >
          {summary.availableByType.length === 0 ? (
            <p className="muted" style={{ padding: "8px 12px" }}>
              Nenhum equipamento disponível.
            </p>
          ) : (
            summary.availableByType.map((it) => (
              <div key={it.type} className="stat-expand-row">
                <span style={{ fontWeight: 600, fontSize: 14 }}>{it.type}</span>
                <span className="badge badge-green">{it.count}</span>
              </div>
            ))
          )}
        </Stat>
        <Stat
          icon="👥"
          tone="blue"
          value={summary.activeAssignments}
          label="Atribuídos agora"
          detail="em poder de colaboradores"
        />
      </div>

      <div
        className="stat-grid"
        style={{ marginTop: 16, gridTemplateColumns: "repeat(2, 1fr)", alignItems: "start" }}
      >
        <Stat
          icon="🔧"
          tone="amber"
          value={maintenance}
          label="Em manutenção"
          detail={`${summary.upcomingMaintenance} manutenção(ões) agendada(s)`}
          expandable
          expanded={expanded === "maintenance"}
          onToggle={() => setExpanded((e) => (e === "maintenance" ? null : "maintenance"))}
        >
          {summary.maintenanceEquipment.length === 0 ? (
            <p className="muted" style={{ padding: "8px 12px" }}>Nenhum equipamento em manutenção agendada.</p>
          ) : (
            summary.maintenanceEquipment.map((it) => (
              <div key={it.id} className="stat-expand-row">
                <div style={{ minWidth: 0 }}>
                  <Link to={`/equipamentos/${it.id}`} style={{ fontWeight: 600, fontSize: 14 }}>
                    {it.name}
                  </Link>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {it.type} · SN {it.serialNumber || "—"} · agendada para {formatDate(it.scheduledFor)}
                  </div>
                </div>
                <span className="badge badge-amber">Manutenção</span>
              </div>
            ))
          )}
        </Stat>
        <Stat
          icon="⚠️"
          tone="red"
          value={summary.overdueMaintenance}
          label="Manutenções atrasadas"
          detail="requerem atenção imediata"
          alert={summary.overdueMaintenance > 0}
          expandable
          expanded={expanded === "overdue"}
          onToggle={() => setExpanded((e) => (e === "overdue" ? null : "overdue"))}
        >
          {summary.overdueEquipment.length === 0 ? (
            <p className="muted" style={{ padding: "8px 12px" }}>Nenhuma manutenção atrasada.</p>
          ) : (
            summary.overdueEquipment.map((it) => (
              <div key={it.id} className="stat-expand-row">
                <div style={{ minWidth: 0 }}>
                  <Link to={`/equipamentos/${it.id}`} style={{ fontWeight: 600, fontSize: 14 }}>
                    {it.name}
                  </Link>
                  <div style={{ fontSize: 12, color: "var(--red-fg)", fontWeight: 600 }}>
                    {it.type} · SN {it.serialNumber || "—"} · atrasada há {it.daysLate} dia(s)
                  </div>
                </div>
                <span className="badge badge-red">Atrasado</span>
              </div>
            ))
          )}
        </Stat>
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
  expandable = false,
  expanded = false,
  onToggle,
  children,
}: {
  icon: ReactNode;
  value: number;
  label: string;
  detail?: string;
  tone?: string;
  alert?: boolean;
  expandable?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  children?: ReactNode;
}) {
  const header = (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div className={`stat-icon tone-${tone}`} aria-hidden="true">
          {icon}
        </div>
        {expandable && (
          <span className={`stat-chevron${expanded ? " open" : ""}`} aria-hidden="true">
            ⌄
          </span>
        )}
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {detail && <div className="stat-detail">{detail}</div>}
    </>
  );

  if (!expandable) {
    return <div className={`stat-card${alert ? " alert" : ""}`}>{header}</div>;
  }

  return (
    <div className={`stat-card stat-card-expandable${alert ? " alert" : ""}`}>
      <button
        type="button"
        className="stat-card-trigger"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        {header}
      </button>
      {expanded && <div className="stat-expand-panel">{children}</div>}
    </div>
  );
}
