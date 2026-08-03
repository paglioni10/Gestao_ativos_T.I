import { useEffect, useState } from "react";
import { api } from "../lib/api";

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  createdAt: string;
  performedBy: { name: string } | null;
  equipment: { name: string } | null;
}

interface EquipmentType {
  id: string;
  name: string;
}

// Rótulo + tom de cor por tipo de ação.
const ACTIONS: Record<string, { label: string; tone: string }> = {
  EQUIPMENT_CREATED: { label: "Equipamento cadastrado", tone: "green" },
  EQUIPMENT_UPDATED: { label: "Equipamento editado", tone: "blue" },
  EQUIPMENT_RETIRED: { label: "Equipamento baixado", tone: "gray" },
  ASSIGNMENT_CREATED: { label: "Entrega registrada", tone: "blue" },
  ASSIGNMENT_RETURNED: { label: "Devolução registrada", tone: "green" },
  MAINTENANCE_SCHEDULED: { label: "Manutenção agendada", tone: "amber" },
  MAINTENANCE_COMPLETED: { label: "Manutenção concluída", tone: "green" },
  CREDENTIAL_CREATED: { label: "Senha adicionada ao cofre", tone: "blue" },
  CREDENTIAL_REVEALED: { label: "Senha revelada", tone: "red" },
  CREDENTIAL_DELETED: { label: "Senha removida do cofre", tone: "gray" },
  USER_CREATED: { label: "Usuário criado", tone: "blue" },
  USER_PASSWORD_RESET: { label: "Senha redefinida pelo admin", tone: "blue" },
  PASSWORD_RESET_REQUESTED: { label: "Pedido de redefinição de senha", tone: "amber" },
  REQUEST_CREATED: { label: "Acesso a senha solicitado", tone: "amber" },
  REQUEST_APPROVED: { label: "Acesso a senha aprovado", tone: "green" },
  REQUEST_DENIED: { label: "Acesso a senha negado", tone: "red" },
};

const PERIODS: { value: string; label: string }[] = [
  { value: "", label: "Sem filtro de data" },
  { value: "week", label: "Semana atual" },
  { value: "month", label: "Mês atual" },
  { value: "semester", label: "Semestre atual" },
  { value: "year", label: "Ano atual" },
];

export function Audit() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [types, setTypes] = useState<EquipmentType[]>([]);
  const [typeId, setTypeId] = useState("");
  const [period, setPeriod] = useState("");

  // Carrega os tipos uma vez (para o filtro).
  useEffect(() => {
    api.get<EquipmentType[]>("/equipment-types").then((res) => setTypes(res.data));
  }, []);

  // Recarrega a trilha sempre que algum filtro muda.
  useEffect(() => {
    const params: Record<string, string> = {};
    if (typeId) params.typeId = typeId;
    if (period) params.period = period;
    api
      .get<AuditLog[]>("/audit", { params: Object.keys(params).length ? params : undefined })
      .then((res) => setLogs(res.data));
  }, [typeId, period]);

  return (
    <div>
      <h1>Trilha de auditoria</h1>
      <p className="muted">Registro imutável de quem fez o quê e quando</p>

      <div className="form-row" style={{ marginBottom: 16 }}>
        <div className="field" style={{ maxWidth: 260 }}>
          <label htmlFor="audit-filter">Filtrar por equipamento</label>
          <select
            id="audit-filter"
            value={typeId}
            onChange={(e) => setTypeId(e.target.value)}
          >
            <option value="">Todos os equipamentos</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{ maxWidth: 220 }}>
          <label htmlFor="audit-period">Filtrar por período</label>
          <select
            id="audit-period"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="panel" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Quando</th>
              <th scope="col">Ação</th>
              <th scope="col">Equipamento</th>
              <th scope="col">Por</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => {
              const conf = ACTIONS[log.action];
              return (
                <tr key={log.id}>
                  <td>{new Date(log.createdAt).toLocaleString("pt-BR")}</td>
                  <td>
                    <span className={`badge badge-${conf?.tone ?? "gray"}`}>
                      {conf?.label ?? log.action}
                    </span>
                  </td>
                  <td>{log.equipment?.name ?? "—"}</td>
                  <td>{log.performedBy?.name ?? "—"}</td>
                </tr>
              );
            })}
            {logs.length === 0 && (
              <tr>
                <td colSpan={4} className="empty">
                  Nenhum registro para este filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
