import { ReactNode, useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";

interface StatRow { name: string; pct: number; count: number; tone: "green" | "red" | "amber" | "gray"; }
interface ListRow { name: string; count: number; }
interface EquipmentRow { name: string; nameAlert?: boolean; detail: string; detailAlert?: boolean; tag: string; }

interface Summary {
  total: number; available: number; assigned: number; maintenance: number; overdue: number;
  totalDetail: string; availableDetail: string; assignedDetail: string;
  maintenanceDetail: string; overdueDetail: string;
  totalRows: StatRow[];
  availableRows: ListRow[];
  assignedRows: StatRow[];
  maintenanceRows: EquipmentRow[];
  overdueRows: EquipmentRow[];
}

type ModalKey = "total" | "available" | "assigned" | "maintenance" | "overdue" | null;

const toneColors: Record<string, { bg: string; fg: string }> = {
  green: { bg: "#e2f5ea", fg: "#1d8a4a" },
  red: { bg: "#fdecec", fg: "#c71c22" },
  amber: { bg: "#fdeccf", fg: "#b96a04" },
  gray: { bg: "#f0f0f0", fg: "#2e2d2c" },
};

// Ícones monocromáticos (cinza) para os cartões — em vez de emojis coloridos,
// deixam o quadrado de fundo uniformemente cinza claro.
function Svg({ children }: { children: ReactNode }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const ICONS: Record<Exclude<ModalKey, null>, ReactNode> = {
  total: (
    <Svg>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </Svg>
  ),
  available: (
    <Svg>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </Svg>
  ),
  assigned: (
    <Svg>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Svg>
  ),
  maintenance: (
    <Svg>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </Svg>
  ),
  overdue: (
    <Svg>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </Svg>
  ),
};

export function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [modal, setModal] = useState<ModalKey>(null);

  useEffect(() => {
    api.get<Summary>("/dashboard/summary").then((res) => setSummary(res.data)).catch(() => setSummary(null));
  }, []);

  useEffect(() => {
    if (!modal) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setModal(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal]);

  if (!summary) {
    return (
      <div>
        <h1>Olá, {user?.name}</h1>
        <p className="muted">Carregando métricas...</p>
      </div>
    );
  }

  const modals: Record<Exclude<ModalKey, null>, { icon: ReactNode; value: number; valueColor?: string; label: string; detail: string }> = {
    total: { icon: ICONS.total, value: summary.total, label: "Total de equipamentos", detail: summary.totalDetail },
    available: { icon: ICONS.available, value: summary.available, label: "Disponíveis", detail: summary.availableDetail },
    assigned: { icon: ICONS.assigned, value: summary.assigned, label: "Atribuídos agora", detail: summary.assignedDetail },
    maintenance: { icon: ICONS.maintenance, value: summary.maintenance, label: "Em manutenção", detail: summary.maintenanceDetail },
    overdue: { icon: ICONS.overdue, value: summary.overdue, valueColor: "#941915", label: "Manutenções atrasadas", detail: summary.overdueDetail },
  };

  const active = modal ? modals[modal] : null;

  return (
    <div>
      <h1>Olá, {user?.name}</h1>
      <p className="muted">Visão geral dos ativos</p>

      <div className="stat-grid" style={{ marginTop: 20 }}>
        <StatCard icon={ICONS.total} value={summary.total} label="Total de equipamentos" detail={summary.totalDetail} onClick={() => setModal("total")} />
        <StatCard icon={ICONS.available} value={summary.available} label="Disponíveis" detail={summary.availableDetail} onClick={() => setModal("available")} />
        <StatCard icon={ICONS.assigned} value={summary.assigned} label="Atribuídos agora" detail={summary.assignedDetail} onClick={() => setModal("assigned")} />
      </div>

      <div className="stat-grid" style={{ marginTop: 16, gridTemplateColumns: "repeat(2, 1fr)" }}>
        <StatCard icon={ICONS.maintenance} value={summary.maintenance} label="Em manutenção" detail={summary.maintenanceDetail} onClick={() => setModal("maintenance")} />
        <StatCard icon={ICONS.overdue} value={summary.overdue} label="Manutenções atrasadas" detail={summary.overdueDetail} onClick={() => setModal("overdue")} alert={summary.overdue > 0} />
      </div>

      {active && (
        <div className="stat-modal-backdrop" onClick={() => setModal(null)}>
          <div className="stat-modal" onClick={(e) => e.stopPropagation()}>
            <div className="stat-modal-header">
              <div className="stat-icon tone-gray" aria-hidden="true">{active.icon}</div>
              <button className="stat-modal-close" aria-label="Fechar" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="stat-modal-body-top">
              <div className="stat-value" style={{ color: active.valueColor }}>{active.value}</div>
              <div className="stat-label">{active.label}</div>
              <div className="stat-detail">{active.detail}</div>
            </div>
            <div className="stat-modal-divider" />

            {modal === "overdue" && summary.overdueRows.length === 0 && (
              <p className="muted" style={{ padding: "16px 20px" }}>Nenhuma manutenção atrasada.</p>
            )}

            {(modal === "total" || modal === "assigned") && (
              <div className="stat-modal-rows">
                {(modal === "total" ? summary.totalRows : summary.assignedRows).map((row) => {
                  const c = toneColors[row.tone];
                  return (
                    <div key={row.name} className="stat-modal-row">
                      <span className="badge" style={{ background: c.bg, color: c.fg }}>{row.name}</span>
                      <span className="muted" style={{ fontSize: 13 }}>{row.pct}% · {row.count}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {modal === "available" && (
              <div className="stat-modal-rows">
                {summary.availableRows.map((row) => (
                  <div key={row.name} className="stat-modal-row">
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{row.name}</span>
                    <span className="badge badge-green">{row.count}</span>
                  </div>
                ))}
              </div>
            )}

            {(modal === "maintenance" || modal === "overdue") && (modal === "maintenance" ? summary.maintenanceRows : summary.overdueRows).length > 0 && (
              <div className="stat-modal-rows">
                {(modal === "maintenance" ? summary.maintenanceRows : summary.overdueRows).map((row, i) => (
                  <div key={i} className="stat-modal-row">
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: row.nameAlert ? "#c71c22" : undefined }}>{row.name}</div>
                      <div style={{ fontSize: 12, color: row.detailAlert ? "#c71c22" : "#6b6664", fontWeight: row.detailAlert ? 600 : 400 }}>{row.detail}</div>
                    </div>
                    <span className="badge badge-amber">{row.tag}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, value, label, detail, alert = false, onClick }: {
  icon: ReactNode; value: number; label: string; detail?: string; tone?: string; alert?: boolean; onClick: () => void;
}) {
  return (
    <button type="button" className={`stat-card stat-card-clickable${alert ? " alert" : ""}`} onClick={onClick}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div className="stat-icon tone-gray" aria-hidden="true">{icon}</div>
        <span className="stat-chevron" aria-hidden="true">⌃</span>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {detail && <div className="stat-detail">{detail}</div>}
    </button>
  );
}
