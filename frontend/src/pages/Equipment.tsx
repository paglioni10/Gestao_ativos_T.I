import { FormEvent, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "../components/Badge";
import { Spinner } from "../components/Spinner";
import { useAuth } from "../contexts/AuthContext";
import { api, getErrorMessage } from "../lib/api";
import { sortEquipmentTypes } from "../lib/equipmentTypes";
import { downloadModel, parseSpreadsheet } from "../lib/equipmentImport";

interface EquipmentType {
  id: string;
  name: string;
  serialRequired: boolean;
}

interface Equipment {
  id: string;
  name: string;
  type: EquipmentType;
  serialNumber: string | null;
  status: string;
  notes: string | null;
}

export function Equipment() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [items, setItems] = useState<Equipment[]>([]);
  const [types, setTypes] = useState<EquipmentType[]>([]);
  const [form, setForm] = useState({ name: "", typeId: "", serialNumber: "", notes: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Filtro por tipo (separado do typeId do formulário de cadastro/edição)
  const [filterTypeId, setFilterTypeId] = useState("");
  const [filterSerial, setFilterSerial] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Cadastro de novo tipo
  const [addingType, setAddingType] = useState(false);
  const [newType, setNewType] = useState("");
  const [newTypeSerialRequired, setNewTypeSerialRequired] = useState(true);

  // Importação por planilha (.xlsx/.csv)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importReport, setImportReport] = useState<{
    created: number;
    total: number;
    errors: { line: number; message: string }[];
  } | null>(null);

  async function load() {
    try {
      const [eq, tp] = await Promise.all([
        api.get<Equipment[]>("/equipment", {
          params: filterTypeId ? { typeId: filterTypeId } : undefined,
        }),
        api.get<EquipmentType[]>("/equipment-types"),
      ]);
      setItems(eq.data);
      const sorted = sortEquipmentTypes(tp.data);
      setTypes(sorted);
      // Seleciona um tipo padrão se ainda não houver um escolhido.
      setForm((f) => (f.typeId ? f : { ...f, typeId: sorted[0]?.id ?? "" }));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [filterTypeId]);

  // Filtros client-side: nº de série (contém) e status (exato).
  const filteredItems = items.filter((it) => {
    if (
      filterSerial.trim() &&
      !(it.serialNumber ?? "")
        .toLowerCase()
        .includes(filterSerial.trim().toLowerCase())
    )
      return false;
    if (filterStatus && it.status !== filterStatus) return false;
    return true;
  });

  // Quando filtrado por um tipo, ordena por nome do equipamento (A-Z)
  if (filterTypeId) {
    filteredItems.sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" })
    );
  }

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
      setError(getErrorMessage(err, "Erro ao salvar"));
    }
  }

  function handleEdit(item: Equipment) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      typeId: item.type.id,
      serialNumber: item.serialNumber ?? "",
      notes: item.notes ?? "",
    });
  }

  async function handleDelete(item: Equipment) {
    if (!confirm(`Dar baixa em "${item.name}"?`)) return;
    setError("");
    try {
      await api.delete(`/equipment/${item.id}`);
      await load();
    } catch (err: any) {
      setError(getErrorMessage(err, "Erro ao dar baixa"));
    }
  }

  // Exclusão definitiva (hard delete). Diferente da baixa, remove o
  // equipamento de vez. Bloqueada no backend se estiver atribuído.
  async function handleHardDelete(item: Equipment) {
    const reason = prompt(
      `Excluir DEFINITIVAMENTE "${item.name}"? Esta ação não pode ser desfeita.\n\nInforme o motivo da exclusão:`
    );
    // prompt retorna null se cancelar; string vazia se confirmar sem digitar.
    if (reason === null) return;
    if (reason.trim().length < 3) {
      setError("Motivo da exclusão é obrigatório (mínimo 3 caracteres).");
      return;
    }
    setError("");
    try {
      await api.delete(`/equipment/${item.id}/permanent`, {
        data: { reason: reason.trim() },
      });
      await load();
    } catch (err: any) {
      setError(getErrorMessage(err, "Erro ao excluir equipamento"));
    }
  }

  // Lê a planilha selecionada, envia as linhas e mostra o relatório.
  async function handleImportFile(e: FormEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setError("");
    setImportReport(null);
    setImporting(true);
    try {
      const rows = await parseSpreadsheet(file);
      if (rows.length === 0) {
        setError("A planilha está vazia ou não pôde ser lida.");
        return;
      }
      const res = await api.post<{
        created: number;
        total: number;
        errors: { line: number; message: string }[];
      }>("/equipment/import", { rows });
      setImportReport(res.data);
      await load();
    } catch (err: any) {
      setError(getErrorMessage(err, "Erro ao importar planilha"));
    } finally {
      setImporting(false);
      input.value = ""; // permite reimportar o mesmo arquivo
    }
  }

  // Cadastra um novo tipo e já o seleciona no formulário.
  async function saveType() {
    setError("");
    try {
      const res = await api.post<EquipmentType>("/equipment-types", {
        name: newType,
        serialRequired: newTypeSerialRequired,
      });
      setNewType("");
      setNewTypeSerialRequired(true);
      setAddingType(false);
      const tp = await api.get<EquipmentType[]>("/equipment-types");
      setTypes(sortEquipmentTypes(tp.data));
      setForm((f) => ({ ...f, typeId: res.data.id }));
    } catch (err: any) {
      setError(getErrorMessage(err, "Erro ao cadastrar tipo"));
    }
  }

  // Exclui um tipo (bloqueado no backend se houver equipamento usando-o).
  async function deleteType(type: EquipmentType) {
    if (!confirm(`Excluir o tipo "${type.name}"?`)) return;
    setError("");
    try {
      await api.delete(`/equipment-types/${type.id}`);
      await load();
    } catch (err: any) {
      setError(getErrorMessage(err, "Erro ao excluir tipo"));
    }
  }

  function resetForm() {
    setEditingId(null);
    setForm({ name: "", typeId: types[0]?.id ?? "", serialNumber: "", notes: "" });
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
                placeholder="Ex: Iphone 15"
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
              <label htmlFor="eq-serial">
                Nº de série
                {!(
                  types.find((t) => t.id === form.typeId)?.serialRequired ?? true
                ) && <span className="muted"> (opcional)</span>}
              </label>
              <input
                id="eq-serial"
                value={form.serialNumber}
                onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
                placeholder="Ex: 0061"
                required={
                  types.find((t) => t.id === form.typeId)?.serialRequired ?? true
                }
              />
            </div>
            <div className="field" style={{ flex: "1 1 200px" }}>
              <label htmlFor="eq-notes">Obs:</label>
              <input
                id="eq-notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Ex: Capa azul, carregador incluso"
              />
            </div>
            <button type="submit" className="btn btn-primary">
              {editingId ? "Salvar" : "Cadastrar"}
            </button>
            {editingId ? (
              <button type="button" className="btn" onClick={resetForm}>
                Cancelar
              </button>
            ) : (
              // Espaçador invisível: reserva o mesmo "slot" do botão Cancelar da
              // linha "Novo tipo", alinhando "Cadastrar" com "Salvar tipo".
              <span aria-hidden="true" className="btn" style={{ visibility: "hidden" }}>
                Cancelar
              </span>
            )}
          </div>

          {/* Cadastro de novo tipo */}
          <div style={{ marginTop: 12 }}>
            {addingType ? (
              <div className="form-row" style={{ alignItems: "flex-end" }}>
                <div className="field" style={{ flex: "1 1 220px" }}>
                  <label htmlFor="new-type">Novo tipo</label>
                  <input
                    id="new-type"
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    placeholder="Ex.: Tablet"
                  />
                </div>
                <label
                  htmlFor="new-type-serial"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    height: 38,
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                  }}
                >
                  <input
                    id="new-type-serial"
                    type="checkbox"
                    style={{ width: "auto", minWidth: 0 }}
                    checked={newTypeSerialRequired}
                    onChange={(e) => setNewTypeSerialRequired(e.target.checked)}
                  />
                  Exigir nº de série
                </label>
                <button type="button" className="btn btn-primary" onClick={saveType}>
                  Salvar tipo
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setAddingType(false);
                    setNewType("");
                    setNewTypeSerialRequired(true);
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

          {/* Gerenciar tipos existentes */}
          <div
            style={{
              marginTop: 12,
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              alignItems: "center",
            }}
          >
            <span className="muted" style={{ fontSize: 13 }}>
              Tipos cadastrados:
            </span>
            {types.map((t) => (
              <span
                key={t.id}
                className="badge badge-gray"
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                {t.name}
                <button
                  type="button"
                  onClick={() => deleteType(t)}
                  aria-label={`Excluir tipo ${t.name}`}
                  title={`Excluir tipo ${t.name}`}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    lineHeight: 1,
                    color: "inherit",
                    fontSize: 13,
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </form>
      )}

      {isAdmin && (
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
            <strong style={{ fontSize: 14 }}>Importar em massa</strong>
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
              onClick={() => downloadModel(types.map((t) => t.name))}
            >
              Baixar modelo
            </button>
            <span className="muted" style={{ fontSize: 12 }}>
              Colunas: Nome, Tipo, Nº de série, Obs
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
                {importReport.created} de {importReport.total} equipamento(s)
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
      )}

      <div className="form-row" style={{ marginBottom: 16 }}>
        <div className="field" style={{ maxWidth: 260 }}>
          <label htmlFor="eq-filter-type">Filtrar por tipo</label>
          <select
            id="eq-filter-type"
            value={filterTypeId}
            onChange={(e) => setFilterTypeId(e.target.value)}
          >
            <option value="">Todos os tipos</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{ maxWidth: 260 }}>
          <label htmlFor="eq-filter-serial">Buscar por nº de série</label>
          <input
            id="eq-filter-serial"
            value={filterSerial}
            onChange={(e) => setFilterSerial(e.target.value)}
            placeholder="Digite o nº de série..."
          />
        </div>
        <div className="field" style={{ maxWidth: 220 }}>
          <label htmlFor="eq-filter-status">Status</label>
          <select
            id="eq-filter-status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">Todos os status</option>
            <option value="AVAILABLE">Disponível</option>
            <option value="ASSIGNED">Atribuído</option>
            <option value="MAINTENANCE">Manutenção</option>
            <option value="RETIRED">Baixado</option>
          </select>
        </div>
      </div>

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
            {filteredItems.map((item) => (
              <tr key={item.id}>
                <td>
                  <Link to={`/equipamentos/${item.id}`}>{item.name}</Link>
                </td>
                <td>{item.type.name}</td>
                <td>{item.serialNumber || "—"}</td>
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
                    {item.status !== "ASSIGNED" && (
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleHardDelete(item)}
                      >
                        Excluir
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {loading ? (
              <tr>
                <td colSpan={isAdmin ? 5 : 4} className="empty">
                  <Spinner /> Carregando equipamentos...
                </td>
              </tr>
            ) : (
              filteredItems.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4} className="empty">
                    {filterSerial.trim() || filterStatus
                      ? "Nenhum equipamento para os filtros."
                      : filterTypeId
                      ? "Nenhum equipamento deste tipo."
                      : "Nenhum equipamento cadastrado ainda."}
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
