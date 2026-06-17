import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "../components/Badge";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";

interface EquipmentType {
  id: string;
  name: string;
}

interface Equipment {
  id: string;
  name: string;
  type: EquipmentType;
  serialNumber: string;
  status: string;
}

export function Equipment() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [items, setItems] = useState<Equipment[]>([]);
  const [types, setTypes] = useState<EquipmentType[]>([]);
  const [form, setForm] = useState({ name: "", typeId: "", serialNumber: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Cadastro de novo tipo
  const [addingType, setAddingType] = useState(false);
  const [newType, setNewType] = useState("");

  async function load() {
    const [eq, tp] = await Promise.all([
      api.get<Equipment[]>("/equipment"),
      api.get<EquipmentType[]>("/equipment-types"),
    ]);
    setItems(eq.data);
    setTypes(tp.data);
    // Seleciona um tipo padrão se ainda não houver um escolhido.
    setForm((f) => (f.typeId ? f : { ...f, typeId: tp.data[0]?.id ?? "" }));
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
    setForm({ name: item.name, typeId: item.type.id, serialNumber: item.serialNumber });
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

  // Cadastra um novo tipo e já o seleciona no formulário.
  async function saveType() {
    setError("");
    try {
      const res = await api.post<EquipmentType>("/equipment-types", {
        name: newType,
      });
      setNewType("");
      setAddingType(false);
      const tp = await api.get<EquipmentType[]>("/equipment-types");
      setTypes(tp.data);
      setForm((f) => ({ ...f, typeId: res.data.id }));
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Erro ao cadastrar tipo");
    }
  }

  function resetForm() {
    setEditingId(null);
    setForm({ name: "", typeId: types[0]?.id ?? "", serialNumber: "" });
    setAddingType(false);
    setNewType("");
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
                value={form.typeId}
                onChange={(e) => setForm({ ...form, typeId: e.target.value })}
                required
              >
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
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

          {/* Cadastro de novo tipo */}
          <div style={{ marginTop: 12 }}>
            {addingType ? (
              <div className="form-row">
                <div className="field">
                  <label htmlFor="new-type">Novo tipo</label>
                  <input
                    id="new-type"
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    placeholder="Ex.: Tablet"
                  />
                </div>
                <button type="button" className="btn btn-primary" onClick={saveType}>
                  Salvar tipo
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setAddingType(false);
                    setNewType("");
                  }}
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setAddingType(true)}
              >
                + Cadastrar novo tipo
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
                <td>{item.type.name}</td>
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
