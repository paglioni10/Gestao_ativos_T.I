import { FormEvent, useEffect, useState } from "react";
import { Badge } from "../components/Badge";
import { SignaturePad } from "../components/SignaturePad";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";

interface Assignment {
  id: string;
  status: string;
  assignedAt: string;
  returnedAt: string | null;
  termPdfPath: string | null;
  signatureHash: string | null;
  equipment: { id: string; name: string; serialNumber: string };
  receiver: { id: string; name: string };
}

interface Equipment {
  id: string;
  name: string;
  serialNumber: string;
  status: string;
}

interface User {
  id: string;
  name: string;
}

export function Assignments() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [available, setAvailable] = useState<Equipment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState({ equipmentId: "", receiverId: "" });
  const [signature, setSignature] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function load() {
    const [a, eq] = await Promise.all([
      api.get<Assignment[]>("/assignments"),
      api.get<Equipment[]>("/equipment", { params: { status: "AVAILABLE" } }),
    ]);
    setAssignments(a.data);
    setAvailable(eq.data);
    if (isAdmin) {
      const u = await api.get<User[]>("/users");
      setUsers(u.data);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/assignments", {
        ...form,
        signatureDataUrl: signature ?? undefined,
      });
      setForm({ equipmentId: "", receiverId: "" });
      setSignature(null);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Erro ao registrar entrega");
    }
  }

  async function handleReturn(item: Assignment) {
    if (!confirm(`Confirmar devolução de "${item.equipment.name}"?`)) return;
    setError("");
    try {
      await api.patch(`/assignments/${item.id}/return`);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Erro ao registrar devolução");
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

      {isAdmin && (
        <form className="panel" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="field">
              <label>Equipamento disponível</label>
              <select
                value={form.equipmentId}
                onChange={(e) => setForm({ ...form, equipmentId: e.target.value })}
                required
              >
                <option value="">Selecione...</option>
                {available.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    {eq.name} ({eq.serialNumber})
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Colaborador</label>
              <select
                value={form.receiverId}
                onChange={(e) => setForm({ ...form, receiverId: e.target.value })}
                required
              >
                <option value="">Selecione...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <SignaturePad onChange={setSignature} />
            </div>
            <button type="submit" className="btn btn-primary">
              Registrar entrega
            </button>
          </div>
        </form>
      )}

      <div className="panel" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Equipamento</th>
              <th>Colaborador</th>
              <th>Entregue em</th>
              <th>Status</th>
              <th>Termo</th>
              {isAdmin && <th>Ações</th>}
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
            {assignments.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 6 : 5} className="empty">
                  Nenhuma atribuição registrada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
