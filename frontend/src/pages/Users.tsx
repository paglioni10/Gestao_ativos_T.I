import { FormEvent, useEffect, useState } from "react";
import { Badge } from "../components/Badge";
import { api } from "../lib/api";

interface User {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "COLLABORATOR";
  createdAt: string;
}

const emptyForm = {
  name: "",
  email: "",
  password: "",
  role: "COLLABORATOR" as "ADMIN" | "COLLABORATOR",
};

export function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

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
      setError(err.response?.data?.message ?? "Erro ao criar usuário");
    }
  }

  return (
    <div>
      <h1>Colaboradores</h1>
      <p className="muted">Gestão de acessos ao sistema</p>

      {error && <p className="alert-error">{error}</p>}
      {ok && (
        <p className="alert-error" style={{ background: "var(--green-bg)", color: "var(--green-fg)", borderColor: "var(--green-fg)" }}>
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
            <input
              id="user-password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
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
          <button type="submit" className="btn btn-primary">
            Criar usuário
          </button>
        </div>
      </form>

      <div className="panel" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Nome</th>
              <th scope="col">E-mail</th>
              <th scope="col">Papel</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>
                  {u.role === "ADMIN" ? (
                    <Badge tone="blue">Administrador</Badge>
                  ) : (
                    <Badge tone="gray">Colaborador</Badge>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={3} className="empty">
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
