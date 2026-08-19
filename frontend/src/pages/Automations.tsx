import { FormEvent, useEffect, useState } from "react";
import { Badge } from "../components/Badge";
import { Spinner } from "../components/Spinner";
import { api, getErrorMessage } from "../lib/api";
import { sortEquipmentTypes } from "../lib/equipmentTypes";

interface EquipmentType {
  id: string;
  name: string;
}

interface Automation {
  id: string;
  type: "LOW_STOCK";
  name: string;
  equipmentTypeId: string;
  equipmentType: { id: string; name: string };
  threshold: number;
  channel: "EMAIL";
  recipient: string;
  active: boolean;
  availableNow: number;
  lastTriggeredAt: string | null;
}

const emptyForm = {
  equipmentTypeId: "",
  threshold: 3,
  recipient: "",
  name: "",
};

export function Automations() {
  const [items, setItems] = useState<Automation[]>([]);
  const [types, setTypes] = useState<EquipmentType[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const [au, tp] = await Promise.all([
        api.get<Automation[]>("/automations"),
        api.get<EquipmentType[]>("/equipment-types"),
      ]);
      setItems(au.data);
      const sorted = sortEquipmentTypes(tp.data);
      setTypes(sorted);
      setForm((f) => (f.equipmentTypeId ? f : { ...f, equipmentTypeId: sorted[0]?.id ?? "" }));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function resetForm() {
    setEditingId(null);
    setForm({ ...emptyForm, equipmentTypeId: types[0]?.id ?? "" });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setOk("");
    try {
      if (editingId) {
        await api.put(`/automations/${editingId}`, {
          threshold: form.threshold,
          recipient: form.recipient,
          name: form.name || undefined,
        });
        setOk("Automação atualizada.");
      } else {
        await api.post("/automations", { ...form, name: form.name || undefined });
        setOk("Automação criada.");
      }
      resetForm();
      await load();
    } catch (err: any) {
      setError(getErrorMessage(err, "Erro ao salvar automação"));
    }
  }

  function handleEdit(a: Automation) {
    setEditingId(a.id);
    setForm({
      equipmentTypeId: a.equipmentTypeId,
      threshold: a.threshold,
      recipient: a.recipient,
      name: a.name,
    });
  }

  async function toggleActive(a: Automation) {
    setError("");
    setOk("");
    try {
      await api.put(`/automations/${a.id}`, { active: !a.active });
      await load();
    } catch (err: any) {
      setError(getErrorMessage(err, "Erro ao alterar status"));
    }
  }

  async function sendTest(a: Automation) {
    setError("");
    setOk("");
    try {
      const res = await api.post<{ sent: boolean; recipient: string }>(
        `/automations/${a.id}/test-email`
      );
      setOk(`E-mail de teste enviado para ${res.data.recipient}.`);
    } catch (err: any) {
      setError(getErrorMessage(err, "Erro ao enviar e-mail de teste"));
    }
  }

  async function handleDelete(a: Automation) {
    if (!confirm(`Excluir a automação "${a.name}"?`)) return;
    setError("");
    setOk("");
    try {
      await api.delete(`/automations/${a.id}`);
      await load();
    } catch (err: any) {
      setError(getErrorMessage(err, "Erro ao excluir automação"));
    }
  }

  // Tipos que ainda não têm automação (para o seletor de criação).
  const usedTypeIds = new Set(items.map((i) => i.equipmentTypeId));
  const availableTypes = types.filter(
    (t) => editingId != null || !usedTypeIds.has(t.id)
  );

  return (
    <div>
      <h1>Automações</h1>
      <p className="muted">
        Regras que reagem a eventos do sistema. Hoje: alerta de estoque baixo por
        e-mail.
      </p>

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
        <p style={{ marginTop: 0, fontWeight: 600 }}>
          {editingId ? "Editar automação" : "Nova automação — Alerta de estoque baixo"}
        </p>
        <div className="form-row align-top" style={{ alignItems: "flex-end" }}>
          <div className="field">
            <label htmlFor="au-type">Tipo de equipamento</label>
            <select
              id="au-type"
              value={form.equipmentTypeId}
              onChange={(e) => setForm({ ...form, equipmentTypeId: e.target.value })}
              disabled={editingId != null}
              required
            >
              {availableTypes.length === 0 && (
                <option value="">Todos os tipos já têm automação</option>
              )}
              {availableTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ maxWidth: 160 }}>
            <label htmlFor="au-threshold">Avisar quando ≤</label>
            <input
              id="au-threshold"
              type="number"
              min={0}
              value={form.threshold}
              onChange={(e) =>
                setForm({ ...form, threshold: Number(e.target.value) })
              }
              required
            />
          </div>
          <div className="field" style={{ flex: "1 1 220px" }}>
            <label htmlFor="au-recipient">E-mail que recebe o aviso</label>
            <input
              id="au-recipient"
              type="email"
              value={form.recipient}
              onChange={(e) => setForm({ ...form, recipient: e.target.value })}
              placeholder="ex.: compras@americanburrs.com"
              required
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!editingId && availableTypes.length === 0}
          >
            {editingId ? "Salvar" : "Criar automação"}
          </button>
          {editingId && (
            <button type="button" className="btn" onClick={resetForm}>
              Cancelar
            </button>
          )}
        </div>
        <div className="field" style={{ marginTop: 12, maxWidth: 360 }}>
          <label htmlFor="au-name">Nome (opcional)</label>
          <input
            id="au-name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Gerado automático se vazio"
          />
        </div>
      </form>

      <div className="panel" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Nome</th>
              <th scope="col">O que faz</th>
              <th scope="col">Canal</th>
              <th scope="col">Status</th>
              <th scope="col">Última execução</th>
              <th scope="col">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => (
              <tr key={a.id}>
                <td style={{ fontWeight: 600 }}>{a.name}</td>
                <td className="muted" style={{ fontSize: 13 }}>
                  Avisa quando os disponíveis de <strong>{a.equipmentType.name}</strong>{" "}
                  chegam a <strong>{a.threshold}</strong> — envia e-mail para{" "}
                  {a.recipient}.
                  <br />
                  Disponíveis agora: {a.availableNow}.
                </td>
                <td>E-mail</td>
                <td>
                  {a.active ? (
                    <Badge tone="green">Ativa</Badge>
                  ) : (
                    <Badge tone="gray">Inativa</Badge>
                  )}
                </td>
                <td className="muted" style={{ fontSize: 13 }}>
                  {a.lastTriggeredAt
                    ? new Date(a.lastTriggeredAt).toLocaleString("pt-BR")
                    : "—"}
                </td>
                <td>
                  <div className="action-grid">
                    <button className="btn btn-sm" onClick={() => handleEdit(a)}>
                      Editar
                    </button>
                    <button className="btn btn-sm" onClick={() => toggleActive(a)}>
                      {a.active ? "Desativar" : "Ativar"}
                    </button>
                    <button className="btn btn-sm" onClick={() => sendTest(a)}>
                      Testar e-mail
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(a)}
                    >
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {loading ? (
              <tr>
                <td colSpan={6} className="empty">
                  <Spinner /> Carregando automações...
                </td>
              </tr>
            ) : (
              items.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty">
                    Nenhuma automação criada ainda.
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
