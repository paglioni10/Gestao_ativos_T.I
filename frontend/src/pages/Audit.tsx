import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  createdAt: string;
  performedBy: { name: string } | null;
}

// Traduz os códigos de ação para um texto legível.
const ACTION_LABELS: Record<string, string> = {
  EQUIPMENT_CREATED: "Equipamento cadastrado",
  EQUIPMENT_UPDATED: "Equipamento editado",
  EQUIPMENT_RETIRED: "Equipamento baixado",
  ASSIGNMENT_CREATED: "Entrega registrada",
  ASSIGNMENT_RETURNED: "Devolução registrada",
  MAINTENANCE_SCHEDULED: "Manutenção agendada",
  MAINTENANCE_COMPLETED: "Manutenção concluída",
  CREDENTIAL_CREATED: "Senha adicionada ao cofre",
  CREDENTIAL_REVEALED: "Senha revelada",
  CREDENTIAL_DELETED: "Senha removida do cofre",
};

export function Audit() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    api.get<AuditLog[]>("/audit").then((res) => setLogs(res.data));
  }, []);

  return (
    <div className="container">
      <button onClick={() => navigate("/")}>← Voltar</button>
      <h1>Trilha de auditoria</h1>
      <p style={{ color: "#666" }}>
        Registro imutável de quem fez o quê e quando.
      </p>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left" }}>
            <th>Quando</th>
            <th>Ação</th>
            <th>Entidade</th>
            <th>Por</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} style={{ borderTop: "1px solid #ddd" }}>
              <td>{new Date(log.createdAt).toLocaleString("pt-BR")}</td>
              <td>{ACTION_LABELS[log.action] ?? log.action}</td>
              <td>{log.entity}</td>
              <td>{log.performedBy?.name ?? "—"}</td>
            </tr>
          ))}
          {logs.length === 0 && (
            <tr>
              <td colSpan={4} style={{ padding: 16, color: "#666" }}>
                Nenhum registro ainda.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
