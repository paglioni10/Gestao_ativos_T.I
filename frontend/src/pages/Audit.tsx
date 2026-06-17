import { useEffect, useState } from "react";
import { api } from "../lib/api";

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  createdAt: string;
  performedBy: { name: string } | null;
  equipment: { name: string; type: string } | null;
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
};

// Tipos de equipamento para o filtro (valor da API -> rótulo em PT).
const TYPES: { value: string; label: string }[] = [
  { value: "", label: "Todos os equipamentos" },
  { value: "NOTEBOOK", label: "Notebook" },
  { value: "DESKTOP", label: "Desktop" },
  { value: "MONITOR", label: "Monitor" },
  { value: "PHONE", label: "Celular" },
  { value: "PERIPHERAL", label: "Periférico" },
  { value: "TOOL", label: "Ferramenta" },
  { value: "OTHER", label: "Outro" },
];

export function Audit() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [type, setType] = useState("");

  useEffect(() => {
    api
      .get<AuditLog[]>("/audit", {
        params: type ? { equipmentType: type } : undefined,
      })
      .then((res) => setLogs(res.data));
  }, [type]);

  return (
    <div>
      <h1>Trilha de auditoria</h1>
      <p className="muted">Registro imutável de quem fez o quê e quando</p>

      <div className="field" style={{ maxWidth: 260, marginBottom: 16 }}>
        <label htmlFor="audit-filter">Filtrar por equipamento</label>
        <select
          id="audit-filter"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
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
