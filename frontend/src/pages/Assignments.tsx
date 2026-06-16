import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
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

  // Registra a entrega de um equipamento a um colaborador (com assinatura).
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

  // Registra a devolução de uma atribuição ativa.
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

  // Baixa o PDF do termo. Como a rota exige token, buscamos via api (que
  // anexa o Authorization) e geramos um download a partir do blob.
  async function downloadTerm(id: string) {
    const res = await api.get(`/assignments/${id}/term`, {
      responseType: "blob",
    });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = `termo-${id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="container">
      <button onClick={() => navigate("/")}>← Voltar</button>
      <h1>Atribuições</h1>

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {/* Formulário de entrega: apenas admin. */}
      {isAdmin && (
        <form
          onSubmit={handleSubmit}
          style={{
            background: "#fff",
            borderRadius: 8,
            padding: 16,
            marginBottom: 24,
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            alignItems: "flex-end",
          }}
        >
          <div>
            <label style={{ display: "block" }}>Equipamento disponível</label>
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
          <div>
            <label style={{ display: "block" }}>Colaborador</label>
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
          <SignaturePad onChange={setSignature} />
          <button type="submit">Registrar entrega</button>
        </form>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left" }}>
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
            <tr key={item.id} style={{ borderTop: "1px solid #ddd" }}>
              <td>
                {item.equipment.name}
                <br />
                <small style={{ color: "#888" }}>
                  {item.equipment.serialNumber}
                </small>
              </td>
              <td>{item.receiver.name}</td>
              <td>{new Date(item.assignedAt).toLocaleDateString("pt-BR")}</td>
              <td>{item.status}</td>
              <td>
                {item.termPdfPath ? (
                  <button onClick={() => downloadTerm(item.id)}>
                    Baixar termo
                  </button>
                ) : (
                  <span style={{ color: "#aaa" }}>—</span>
                )}
              </td>
              {isAdmin && (
                <td>
                  {item.status === "ACTIVE" && (
                    <button onClick={() => handleReturn(item)}>
                      Registrar devolução
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
          {assignments.length === 0 && (
            <tr>
              <td colSpan={isAdmin ? 6 : 5} style={{ padding: 16, color: "#666" }}>
                Nenhuma atribuição registrada ainda.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
