import { FormEvent, useEffect, useState } from "react";
import { Badge } from "../components/Badge";
import { Spinner } from "../components/Spinner";
import { useAuth } from "../contexts/AuthContext";
import { api, getErrorMessage } from "../lib/api";
import { Sector, SECTOR_OPTIONS } from "../lib/sectors";

interface Assignment {
  id: string;
  status: string;
  assignedAt: string;
  returnedAt: string | null;
  termPdfPath: string | null;
  equipment: { id: string; name: string; serialNumber: string };
  receiver: { id: string; name: string };
}

interface Equipment {
  id: string;
  name: string;
  serialNumber: string;
  status: string;
  type: { id: string; name: string };
}

interface EquipmentType {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
  sector: Sector | null;
}

export function Assignments() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [available, setAvailable] = useState<Equipment[]>([]);
  const [equipTypes, setEquipTypes] = useState<EquipmentType[]>([]);
  const [typeFilter, setTypeFilter] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [equipmentIds, setEquipmentIds] = useState<string[]>([]);
  const [sectorFilter, setSectorFilter] = useState<Sector | "">("");
  const [receiverId, setReceiverId] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const [a, eq, tp] = await Promise.all([
        api.get<Assignment[]>("/assignments"),
        api.get<Equipment[]>("/equipment", { params: { status: "AVAILABLE" } }),
        api.get<EquipmentType[]>("/equipment-types"),
      ]);
      setAssignments(a.data);
      setAvailable(eq.data);
      setEquipTypes(tp.data);
      if (isAdmin) {
        const u = await api.get<User[]>("/users");
        setUsers(u.data);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function toggleEquipment(id: string) {
    setEquipmentIds((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  }

  // Registra uma entrega para cada equipamento selecionado, para o mesmo
  // colaborador.
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setOk("");
    if (equipmentIds.length === 0) {
      setError("Selecione ao menos um equipamento.");
      return;
    }
    setSubmitting(true);
    const failed: string[] = [];
    for (const equipmentId of equipmentIds) {
      try {
        await api.post("/assignments", { equipmentId, receiverId });
      } catch (err: any) {
        const eq = available.find((a) => a.id === equipmentId);
        failed.push(`${eq?.name ?? equipmentId}: ${getErrorMessage(err, "erro")}`);
      }
    }
    setSubmitting(false);

    const successCount = equipmentIds.length - failed.length;
    if (successCount > 0) {
      setOk(`${successCount} equipamento(s) entregue(s) com sucesso.`);
    }
    if (failed.length > 0) {
      setError(`Falha em ${failed.length} equipamento(s): ${failed.join("; ")}`);
    }

    setEquipmentIds([]);
    setReceiverId("");
    await load();
  }

  async function handleReturn(item: Assignment) {
    if (!confirm(`Confirmar devolução de "${item.equipment.name}"?`)) return;
    setError("");
    try {
      await api.patch(`/assignments/${item.id}/return`);
      await load();
    } catch (err: any) {
      setError(getErrorMessage(err, "Erro ao registrar devolução"));
    }
  }

  // Baixa o PDF do termo via api (que anexa o token) a partir do blob.
  async function downloadTerm(id: string) {
    const res = await api.get(`/assignments/${id}/term`, { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = `termo-${id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <h1>Atribuições</h1>
      <p className="muted">Entrega e devolução de equipamentos</p>

      {error && <p className="alert-error">{error}</p>}
      {ok && (
        <p
          className="alert-error"
          style={{ background: "var(--green-bg)", color: "var(--green-fg)" }}
        >
          {ok}
        </p>
      )}

      {isAdmin && (
        <form className="panel" onSubmit={handleSubmit}>
          <div className="form-row align-top">
            <div className="field">
              <label htmlFor="as-type">Tipo de equipamento</label>
              <select
                id="as-type"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="">Todos os tipos</option>
                {equipTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>
                Equipamentos disponíveis{" "}
                {equipmentIds.length > 0 && (
                  <span className="muted">({equipmentIds.length} selecionado(s))</span>
                )}
              </label>
              <div className="checklist" role="group" aria-label="Equipamentos disponíveis">
                {available
                  .filter((eq) => !typeFilter || eq.type.id === typeFilter)
                  .map((eq) => (
                    <label key={eq.id}>
                      <input
                        type="checkbox"
                        checked={equipmentIds.includes(eq.id)}
                        onChange={() => toggleEquipment(eq.id)}
                      />
                      {eq.name} ({eq.serialNumber})
                    </label>
                  ))}
                {available.filter((eq) => !typeFilter || eq.type.id === typeFilter)
                  .length === 0 && (
                  <div className="muted" style={{ padding: 10, fontSize: 13 }}>
                    {typeFilter
                      ? "Nenhum equipamento disponível deste tipo."
                      : "Nenhum equipamento disponível."}
                  </div>
                )}
              </div>
            </div>
            <div className="field">
              <label htmlFor="as-sector">Setor</label>
              <select
                id="as-sector"
                value={sectorFilter}
                onChange={(e) => {
                  setSectorFilter(e.target.value as Sector | "");
                  setReceiverId("");
                }}
              >
                <option value="">Todos os setores</option>
                {SECTOR_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="as-receiver">Colaborador</label>
              <select
                id="as-receiver"
                value={receiverId}
                onChange={(e) => setReceiverId(e.target.value)}
                required
              >
                <option value="">Selecione...</option>
                {users
                  .filter((u) => !sectorFilter || u.sector === sectorFilter)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="field">
              <label aria-hidden="true">&nbsp;</label>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting
                  ? "Registrando..."
                  : equipmentIds.length > 1
                  ? `Registrar entrega (${equipmentIds.length})`
                  : "Registrar entrega"}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="panel" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Equipamento</th>
              <th scope="col">Colaborador</th>
              <th scope="col">Entregue em</th>
              <th scope="col">Status</th>
              <th scope="col">Termo</th>
              {isAdmin && <th scope="col">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {assignments.map((item) => (
              <tr key={item.id}>
                <td>
                  {item.equipment.name}
                  <br />
                  <span className="muted">{item.equipment.serialNumber}</span>
                </td>
                <td>{item.receiver.name}</td>
                <td>{new Date(item.assignedAt).toLocaleDateString("pt-BR")}</td>
                <td>
                  <Badge status={item.status} />
                </td>
                <td>
                  {item.termPdfPath ? (
                    <button className="btn btn-sm" onClick={() => downloadTerm(item.id)}>
                      Baixar termo
                    </button>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                {isAdmin && (
                  <td>
                    {item.status === "ACTIVE" && (
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => handleReturn(item)}
                      >
                        Registrar devolução
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {loading ? (
              <tr>
                <td colSpan={isAdmin ? 6 : 5} className="empty">
                  <Spinner /> Carregando atribuições...
                </td>
              </tr>
            ) : (
              assignments.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="empty">
                    Nenhuma atribuição registrada ainda.
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
