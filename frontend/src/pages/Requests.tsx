import { useEffect, useState } from "react";
import { Badge } from "../components/Badge";
import { api } from "../lib/api";

interface PasswordRequest {
  id: string;
  status: "PENDING" | "APPROVED" | "DENIED";
  createdAt: string;
  equipment: { id: string; name: string };
  requester: { id: string; name: string };
}

const STATUS: Record<string, { tone: string; label: string }> = {
  PENDING: { tone: "amber", label: "Pendente" },
  APPROVED: { tone: "green", label: "Aprovada" },
  DENIED: { tone: "red", label: "Negada" },
};

export function Requests() {
  const [requests, setRequests] = useState<PasswordRequest[]>([]);
  const [error, setError] = useState("");

  async function load() {
    const res = await api.get<PasswordRequest[]>("/password-requests");
    setRequests(res.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function resolve(id: string, action: "approve" | "deny") {
    setError("");
    try {
      await api.patch(`/password-requests/${id}`, { action });
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Erro ao resolver solicitação");
    }
  }

  return (
    <div>
      <h1>Solicitações de senha</h1>
      <p className="muted">Pedidos de acesso às senhas dos equipamentos</p>

      {error && <p className="alert-error">{error}</p>}

      <div className="panel" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Quando</th>
              <th scope="col">Colaborador</th>
              <th scope="col">Equipamento</th>
              <th scope="col">Situação</th>
              <th scope="col">Ações</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => {
              const st = STATUS[r.status];
              return (
                <tr key={r.id}>
                  <td>{new Date(r.createdAt).toLocaleString("pt-BR")}</td>
                  <td>{r.requester.name}</td>
                  <td>{r.equipment.name}</td>
                  <td>
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </td>
                  <td>
                    {r.status === "PENDING" ? (
                      <>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => resolve(r.id, "approve")}
                        >
                          Aprovar
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => resolve(r.id, "deny")}
                        >
                          Negar
                        </button>
                      </>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {requests.length === 0 && (
              <tr>
                <td colSpan={5} className="empty">
                  Nenhuma solicitação.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
