import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "../components/Badge";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";

interface Equipment {
  id: string;
  name: string;
  type: string;
  serialNumber: string;
  status: string;
}

const TYPES = [
  "NOTEBOOK",
  "DESKTOP",
  "MONITOR",
  "PHONE",
  "PERIPHERAL",
  "TOOL",
  "OTHER",
];

const emptyForm = { name: "", type: "NOTEBOOK", serialNumber: "" };

export function Equipment() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [items, setItems] = useState<Equipment[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function load() {
    const res = await api.get<Equipment[]>("/equipment");
    setItems(res.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      if (editingId) {
        await api.put(`/equipment/${editingId}`, form);
      } else {
        await api.post("/equipment", form);
      }
      resetForm();
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Erro ao salvar");
    }
  }

  function handleEdit(item: Equipment) {
    setEditingId(item.id);
    setForm({ name: item.name, type: item.type, serialNumber: item.serialNumber });
  }

  async function handleDelete(item: Equipment) {
    if (!confirm(`Dar baixa em "${item.name}"?`)) return;
    setError("");
    try {
      await api.delete(`/equipment/${item.id}`);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Erro ao dar baixa");
    }
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  return (
    <div>
      <h1>Equipamentos</h1>
      <p className="muted">Cadastro e situação dos ativos</p>

      {error && <p className="alert-error">{error}</p>}

      {isAdmin && (
        <form className="panel" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="field">
              <label htmlFor="eq-name">Nome</label>
              <input
                id="eq-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="eq-type">Tipo</label>
              <select
                id="eq-type"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="eq-serial">Nº de série</label>
              <input
                id="eq-serial"
                value={form.serialNumber}
                onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary">
              {editingId ? "Salvar" : "Cadastrar"}
            </button>
            {editingId && (
              <button type="button" className="btn" onClick={resetForm}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      )}

      <div className="panel" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Nome</th>
              <th scope="col">Tipo</th>
              <th scope="col">Nº de série</th>
              <th scope="col">Status</th>
              {isAdmin && <th scope="col">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <Link to={`/equipamentos/${item.id}`}>{item.name}</Link>
                </td>
                <td>{item.type}</td>
                <td>{item.serialNumber}</td>
                <td>
                  <Badge status={item.status} />
                </td>
                {isAdmin && (
                  <td>
                    <button className="btn btn-sm" onClick={() => handleEdit(item)}>
                      Editar
                    </button>
                    {item.status !== "RETIRED" && (
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(item)}
                      >
                        Baixar
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 5 : 4} className="empty">
                  Nenhum equipamento cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
