import { FormEvent, useEffect, useRef, useState } from "react";
import { Badge } from "../components/Badge";
import { PasswordInput } from "../components/PasswordInput";
import { Spinner } from "../components/Spinner";
import { useAuth } from "../contexts/AuthContext";
import { api, getErrorMessage } from "../lib/api";

import { Sector, SECTOR_LABEL, SECTOR_OPTIONS } from "../lib/sectors";
import { downloadUserModel, parseUserSpreadsheet } from "../lib/userImport";

interface User {
  id: string;
  name: string;
  email: string | null;
  role: "ADMIN" | "COLLABORATOR";
  jobTitle: string | null;
  sector: Sector | null;
  createdAt: string;
}

const emptyForm = {
  name: "",
  email: "",
  password: "American@!",
  role: "COLLABORATOR" as "ADMIN" | "COLLABORATOR",
  jobTitle: "",
  sector: "" as Sector | "",
};

export function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(true);

  // Redefinição de senha (admin)
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");

  async function load() {
    try {
      const res = await api.get<User[]>("/users");
      setUsers(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Importação em massa por planilha (.xlsx/.csv)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importReport, setImportReport] = useState<{
    created: number;
    total: number;
    errors: { line: number; message: string }[];
  } | null>(null);

  async function handleImportFile(e: FormEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setError("");
    setOk("");
    setImportReport(null);
    setImporting(true);
    try {
      const rows = await parseUserSpreadsheet(file);
      if (rows.length === 0) {
        setError("A planilha está vazia ou não pôde ser lida.");
        return;
      }
      const res = await api.post<{
        created: number;
        total: number;
        errors: { line: number; message: string }[];
      }>("/users/import", { rows });
      setImportReport(res.data);
      await load();
    } catch (err: any) {
      setError(getErrorMessage(err, "Erro ao importar planilha"));
    } finally {
      setImporting(false);
      input.value = "";
    }
  }

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
              name="novo-colaborador-nome"
              autoComplete="off"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="user-email">
              {form.role === "ADMIN" ? "E-mail" : "E-mail (opcional)"}
            </label>
            <input
              id="user-email"
              name="novo-colaborador-email"
              type="email"
              autoComplete="off"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required={form.role === "ADMIN"}
            />
          </div>
          <div className="field">
            <label htmlFor="user-password">Senha</label>
            <PasswordInput
              id="user-password"
              name="novo-colaborador-senha"
              autoComplete="new-password"
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
          <div className="field">
            <label htmlFor="user-sector">Setor</label>
            <select
              id="user-sector"
              value={form.sector}
              onChange={(e) =>
                setForm({ ...form, sector: e.target.value as Sector | "" })
              }
              required
            >
              <option value="" disabled>
                Selecione…
              </option>
              {SECTOR_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-primary">
            Criar usuário
          </button>
        </div>
      </form>

      <div className="panel">
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.csv"
          style={{ display: "none" }}
          onChange={handleImportFile}
        />
        <div
          style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}
        >
          <strong style={{ fontSize: 14 }}>Cadastro em massa</strong>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={importing}
            onClick={() => fileInputRef.current?.click()}
          >
            {importing ? "Importando..." : "Importar planilha (.xlsx/.csv)"}
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => downloadUserModel()}
          >
            Baixar modelo
          </button>
          <span className="muted" style={{ fontSize: 12 }}>
            Colunas: Nome, Email, Cargo, Setor, Papel, Senha (Papel/Senha
            opcionais)
          </span>
        </div>

        {importReport && (
          <div style={{ marginTop: 12 }}>
            <p
              className="alert-error"
              style={{
                background: "var(--green-bg)",
                color: "var(--green-fg)",
                borderColor: "var(--green-fg)",
                marginBottom: importReport.errors.length ? 8 : 0,
              }}
            >
              {importReport.created} de {importReport.total} colaborador(es)
              importado(s) com sucesso.
            </p>
            {importReport.errors.length > 0 && (
              <div className="alert-error">
                <strong>
                  {importReport.errors.length} linha(s) não importada(s):
                </strong>
                <ul style={{ margin: "6px 0 0", paddingLeft: 20 }}>
                  {importReport.errors.map((er) => (
                    <li key={er.line}>
                      Linha {er.line}: {er.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

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
              <th scope="col">Setor</th>
              <th scope="col">Papel</th>
              <th scope="col">Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email ?? "—"}</td>
                <td>{u.jobTitle ?? "—"}</td>
                <td>{u.sector ? SECTOR_LABEL[u.sector] : "—"}</td>
                <td>
                  {u.role === "ADMIN" ? (
                    <Badge tone="blue">Administrador</Badge>
                  ) : (
                    <Badge tone="gray">Colaborador</Badge>
                  )}
                </td>
                <td>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
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
                  </div>
                </td>
              </tr>
            ))}
            {loading ? (
              <tr>
                <td colSpan={6} className="empty">
                  <Spinner /> Carregando usuários...
                </td>
              </tr>
            ) : (
              users.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty">
                    Nenhum usuário cadastrado.
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
