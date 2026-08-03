import { FormEvent, useEffect, useState } from "react";
import { Badge } from "../components/Badge";
import { PasswordInput } from "../components/PasswordInput";
import { api, getErrorMessage } from "../lib/api";

interface ResetRequest {
  id: string;
  email: string;
  status: "PENDING" | "RESOLVED";
  createdAt: string;
  resolvedAt: string | null;
  user: { id: string; name: string; email: string };
  resolvedBy: { name: string } | null;
}

export function Requests() {
  const [requests, setRequests] = useState<ResetRequest[]>([]);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  // Definir nova senha para um pedido específico
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");

  async function load() {
    const res = await api.get<ResetRequest[]>("/password-reset-requests");
    setRequests(res.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleResolve(e: FormEvent) {
    e.preventDefault();
    if (!resolvingId) return;
    setError("");
    setOk("");
    try {
      await api.patch(`/password-reset-requests/${resolvingId}`, {
        password: newPassword,
      });
      setOk(
        "Senha redefinida. Avise o colaborador pela nova senha (Teams, presencial etc.)."
      );
      setResolvingId(null);
      setNewPassword("");
      await load();
    } catch (err: any) {
      setError(getErrorMessage(err, "Erro ao redefinir senha"));
    }
  }

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;

  return (
    <div>
      <h1>Solicitações</h1>
      <p className="muted">
        Pedidos de "esqueci minha senha"
        {pendingCount > 0 && ` · ${pendingCount} pendente(s)`}
      </p>

      {error && <p className="alert-error">{error}</p>}
      {ok && (
        <p
          className="alert-error"
          style={{ background: "var(--green-bg)", color: "var(--green-fg)" }}
        >
          {ok}
        </p>
      )}

      {resolvingId && (
        <form className="panel" onSubmit={handleResolve}>
          <p className="muted" style={{ marginTop: 0 }}>
            Defina uma nova senha para{" "}
            <strong>{requests.find((r) => r.id === resolvingId)?.user.name}</strong>{" "}
            e avise a pessoa por fora (Teams, presencial etc.).
          </p>
          <div className="form-row">
            <div className="field">
              <label htmlFor="reset-password">Nova senha</label>
              <PasswordInput
                id="reset-password"
                value={newPassword}
                onChange={setNewPassword}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Salvar nova senha
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setResolvingId(null);
                setNewPassword("");
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="panel" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Quando</th>
              <th scope="col">Colaborador</th>
              <th scope="col">E-mail</th>
              <th scope="col">Situação</th>
              <th scope="col">Ações</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.createdAt).toLocaleString("pt-BR")}</td>
                <td>{r.user.name}</td>
                <td>{r.email}</td>
                <td>
                  {r.status === "PENDING" ? (
                    <Badge tone="amber">Pendente</Badge>
                  ) : (
                    <Badge tone="green">Resolvida</Badge>
                  )}
                </td>
                <td>
                  {r.status === "PENDING" ? (
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => {
                        setResolvingId(r.id);
                        setNewPassword("");
                        setOk("");
                        setError("");
                      }}
                    >
                      Definir nova senha
                    </button>
                  ) : (
                    <span className="muted">
                      {r.resolvedBy ? `por ${r.resolvedBy.name}` : "—"}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan={5} className="empty">
                  Nenhuma solicitação de redefinição de senha.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
