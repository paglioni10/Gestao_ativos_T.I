import { FormEvent, useEffect, useState } from "react";
import { Badge } from "../components/Badge";
import { PasswordInput } from "../components/PasswordInput";
import { useAuth } from "../contexts/AuthContext";
import { api, getErrorMessage } from "../lib/api";

interface User {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "COLLABORATOR";
  jobTitle: string | null;
  createdAt: string;
}

const emptyForm = {
  name: "",
  email: "",
  password: "",
  role: "COLLABORATOR" as "ADMIN" | "COLLABORATOR",
  jobTitle: "",
};

export function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  // Redefinição de senha (admin)
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");

  async function load() {
    const res = await api.get<User[]>("/users");
    setUsers(res.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setOk("");
    try {
      await api.post("/users", form);
      setOk(`Usuário "${form.name}" criado.`);
      setForm(emptyForm);
      await load();
    } catch (err: any) {
      setError(getErrorMessage(err, "Erro ao criar usuário"));
    }
  }

  async function handleResetPassword(e: FormEvent) {
    e.preventDefault();
    if (!resettingId) return;
    setError("");
    setOk("");
    try {
      await api.patch(`/users/${resettingId}/password`, { password: newPassword });
      setOk("Senha redefinida. Avise o colaborador pela nova senha.");
      setResettingId(null);
      setNewPassword("");
    } catch (err: any) {
      setError(getErrorMessage(err, "Erro ao redefinir senha"));
    }
  }

  async function handleDelete(u: User) {
    if (
      !confirm(
        `Excluir "${u.name}"? Equipamentos atribuídos a ele(a) ficarão disponíveis novamente.`
      )
    )
      return;
    setError("");
    setOk("");
    try {
      await api.delete(`/users/${u.id}`);
      setOk(`Usuário "${u.name}" excluído.`);
      await load();
    } catch (err: any) {
      setError(getErrorMessage(err, "Erro ao excluir usuário"));
    }
  }

  return (
    <div>
      <h1>Colaboradores</h1>
      <p className="muted">Gestão de acessos ao sistema</p>

      {error && <p className="alert-error">{error}</p>}
      {ok && (
        <p
          className="alert-error"
          style={{
            background: "var(--green-bg)",
            color: "var(--green-fg)",
            borderColor: "var(--green-fg)",
          }}
        >
          {ok}
        </p>
      )}

      <form className="panel" onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="field">
            <label htmlFor="user-name">Nome</label>
            <input
              id="user-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="user-email">E-mail</label>
            <input
              id="user-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="user-password">Senha</label>
            <PasswordInput
              id="user-password"
              value={form.password}
              onChange={(v) => setForm({ ...form, password: v })}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="user-role">Papel</label>
            <select
              id="user-role"
              value={form.role}
              onChange={(e) =>
                setForm({ ...form, role: e.target.value as User["role"] })
              }
            >
              <option value="COLLABORATOR">Colaborador</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="user-job-title">Cargo</label>
            <input
              id="user-job-title"
              value={form.jobTitle}
              onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
              placeholder="Ex.: Analista de Suporte"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Criar usuário
          </button>
        </div>
      </form>

      {resettingId && (
        <form className="panel" onSubmit={handleResetPassword}>
          <p className="muted" style={{ marginTop: 0 }}>
            Defina uma nova senha para{" "}
            <strong>{users.find((u) => u.id === resettingId)?.name}</strong> e
            avise a pessoa por fora (Teams, presencial etc.).
          </p>
          <div className="form-row">
            <div className="field">
              <label htmlFor="new-password">Nova senha</label>
              <PasswordInput
                id="new-password"
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
                setResettingId(null);
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
              <th scope="col">Nome</th>
              <th scope="col">E-mail</th>
              <th scope="col">Cargo</th>
              <th scope="col">Papel</th>
              <th scope="col">Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.jobTitle ?? "—"}</td>
                <td>
                  {u.role === "ADMIN" ? (
                    <Badge tone="blue">Administrador</Badge>
                  ) : (
                    <Badge tone="gray">Colaborador</Badge>
                  )}
                </td>
                <td>
                  <button
                    className="btn btn-sm"
                    onClick={() => {
                      setResettingId(u.id);
                      setNewPassword("");
                      setOk("");
                    }}
                  >
                    Redefinir senha
                  </button>
                  {u.id !== currentUser?.id && (
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(u)}
                    >
                      Excluir
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="empty">
                  Nenhum usuário cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
