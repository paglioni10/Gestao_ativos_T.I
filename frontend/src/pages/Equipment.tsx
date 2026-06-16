import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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

// Estado inicial do formulário, reutilizado ao limpar/cancelar.
const emptyForm = { name: "", type: "NOTEBOOK", serialNumber: "" };

export function Equipment() {
  const navigate = useNavigate();
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

  // Cria (POST) ou edita (PUT) conforme estejamos ou não editando um item.
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

  // Preenche o formulário com os dados do item para edição.
  function handleEdit(item: Equipment) {
    setEditingId(item.id);
    setForm({ name: item.name, type: item.type, serialNumber: item.serialNumber });
  }

  // Dá baixa no equipamento (status -> RETIRED) após confirmação.
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
    <div className="container">
      <button onClick={() => navigate("/")}>← Voltar</button>
      <h1>Equipamentos</h1>

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {/* Formulário de cadastro/edição: apenas admin enxerga. */}
      {isAdmin && (
        <form
          onSubmit={handleSubmit}
          style={{
            background: "#fff",
            borderRadius: 8,
            padding: 16,
            marginBottom: 24,
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "flex-end",
          }}
        >
          <div>
            <label style={{ display: "block" }}>Nome</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label style={{ display: "block" }}>Tipo</label>
            <select
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
          <div>
            <label style={{ display: "block" }}>Nº de série</label>
            <input
              value={form.serialNumber}
              onChange={(e) =>
                setForm({ ...form, serialNumber: e.target.value })
              }
              required
            />
          </div>
          <button type="submit">{editingId ? "Salvar" : "Cadastrar"}</button>
          {editingId && (
            <button type="button" onClick={resetForm}>
              Cancelar
            </button>
          )}
        </form>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left" }}>
            <th>Nome</th>
            <th>Tipo</th>
            <th>Nº de série</th>
            <th>Status</th>
            {isAdmin && <th>Ações</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} style={{ borderTop: "1px solid #ddd" }}>
              <td>
                <a
                  onClick={() => navigate(`/equipamentos/${item.id}`)}
                  style={{ color: "#0b66c3", cursor: "pointer" }}
                >
                  {item.name}
                </a>
              </td>
              <td>{item.type}</td>
              <td>{item.serialNumber}</td>
              <td>{item.status}</td>
              {isAdmin && (
                <td>
                  <button onClick={() => handleEdit(item)}>Editar</button>{" "}
                  {item.status !== "RETIRED" && (
                    <button onClick={() => handleDelete(item)}>Baixar</button>
                  )}
                </td>
              )}
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={isAdmin ? 5 : 4} style={{ padding: 16, color: "#666" }}>
                Nenhum equipamento cadastrado ainda.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
