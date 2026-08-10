import { useEffect, useState } from "react";
import { Spinner } from "../components/Spinner";
import { api } from "../lib/api";
import { Sector, SECTOR_OPTIONS } from "../lib/sectors";
import { sortEquipmentTypes } from "../lib/equipmentTypes";

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  createdAt: string;
  performedBy: { name: string } | null;
  equipment: { name: string; serialNumber: string } | null;
  metadata: Record<string, unknown> | null;
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
  USER_DELETED: { label: "Usuário excluído", tone: "gray" },
  EQUIPMENT_RELEASED_USER_DELETED: {
    label: "Equipamento liberado (funcionário excluído)",
    tone: "amber",
  },
};

// Algumas ações têm um texto dinâmico (com nomes específicos), montado a
// partir do metadata gravado na auditoria, em vez de um rótulo fixo.
function actionLabel(log: AuditLog): string {
  if (log.action === "EQUIPMENT_RELEASED_USER_DELETED") {
    const equipmentName = log.equipment?.name ?? String(log.metadata?.equipmentName ?? "Equipamento");
    const userName = String(log.metadata?.userName ?? "colaborador");
    return `${equipmentName} passou a ficar disponível pois ${userName} foi excluído(a)`;
  }
  return ACTIONS[log.action]?.label ?? log.action;
}

const PERIODS: { value: string; label: string }[] = [
  { value: "", label: "Sem filtro de data" },
  { value: "week", label: "Semana atual" },
  { value: "month", label: "Mês atual" },
  { value: "semester", label: "Semestre atual" },
  { value: "year", label: "Ano atual" },
];

// Ações que não envolvem diretamente um equipamento, mas podem ser
// filtradas junto com os tipos de equipamento no mesmo seletor.
const ACTION_FILTERS: { value: string; label: string }[] = [
  { value: "USER_CREATED", label: "Usuário criado" },
  { value: "USER_DELETED", label: "Usuário excluído" },
  { value: "CREDENTIAL_CREATED", label: "Senha registrada no cofre" },
  { value: "PASSWORD_RESET_REQUESTED", label: "Pedido de redefinição de senha" },
];

export function Audit() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [types, setTypes] = useState<EquipmentType[]>([]);
  const [period, setPeriod] = useState("");
  const [typeId, setTypeId] = useState("");
  const [action, setAction] = useState("");
  const [sector, setSector] = useState<Sector | "">("");
  const [loading, setLoading] = useState(true);

  // Carrega os tipos uma vez (para o filtro).
  useEffect(() => {
    api
      .get<EquipmentType[]>("/equipment-types")
      .then((res) => setTypes(sortEquipmentTypes(res.data)));
  }, []);

  // Recarrega a trilha sempre que algum filtro muda.
  useEffect(() => {
    const params: Record<string, string> = {};
    if (typeId) params.typeId = typeId;
    if (action) params.action = action;
    if (period) params.period = period;
    if (sector) params.sector = sector;
    setLoading(true);
    api
      .get<AuditLog[]>("/audit", { params: Object.keys(params).length ? params : undefined })
      .then((res) => setLogs(res.data))
      .finally(() => setLoading(false));
  }, [typeId, action, period, sector]);

  return (
    <div>
      <h1>Trilha de auditoria</h1>
      <p className="muted">Registro imutável de quem fez o quê e quando</p>

      <div className="form-row" style={{ marginBottom: 16 }}>
        <div className="field" style={{ maxWidth: 220 }}>
          <label htmlFor="audit-period">Data</label>
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
        <div className="field" style={{ maxWidth: 240 }}>
          <label htmlFor="audit-type">Equipamento</label>
          <select
            id="audit-type"
            value={typeId}
            onChange={(e) => setTypeId(e.target.value)}
          >
            <option value="">Todos os tipos</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{ maxWidth: 260 }}>
          <label htmlFor="audit-action">Ação</label>
          <select
            id="audit-action"
            value={action}
            onChange={(e) => setAction(e.target.value)}
          >
            <option value="">Todas as ações</option>
            {ACTION_FILTERS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{ maxWidth: 220 }}>
          <label htmlFor="audit-sector">Setor</label>
          <select
            id="audit-sector"
            value={sector}
            onChange={(e) => setSector(e.target.value as Sector | "")}
          >
            <option value="">Todos os setores</option>
            {SECTOR_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
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
                      {actionLabel(log)}
                    </span>
                  </td>
                  <td>
                    {log.equipment ? (
                      <>
                        {log.equipment.name}
                        <br />
                        <span className="muted">{log.equipment.serialNumber}</span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{log.performedBy?.name ?? "—"}</td>
                </tr>
              );
            })}
            {loading ? (
              <tr>
                <td colSpan={4} className="empty">
                  <Spinner /> Carregando registros...
                </td>
              </tr>
            ) : (
              logs.length === 0 && (
                <tr>
                  <td colSpan={4} className="empty">
                    Nenhum registro para este filtro.
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
