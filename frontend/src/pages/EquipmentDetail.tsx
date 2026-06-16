import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";

interface Maintenance {
  id: string;
  description: string;
  scheduledFor: string;
  completedAt: string | null;
}

interface AssignmentLite {
  id: string;
  status: string;
  assignedAt: string;
  returnedAt: string | null;
  receiver: { id: string; name: string };
}

interface EquipmentDetail {
  id: string;
  name: string;
  type: string;
  serialNumber: string;
  status: string;
  assignments: AssignmentLite[];
  maintenances: Maintenance[];
}

export function EquipmentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [equipment, setEquipment] = useState<EquipmentDetail | null>(null);
  const [qrCode, setQrCode] = useState<string>("");
  const [form, setForm] = useState({ description: "", scheduledFor: "" });
  const [error, setError] = useState("");

  async function load() {
    const [eq, qr] = await Promise.all([
      api.get<EquipmentDetail>(`/equipment/${id}`),
      api.get<{ qrCode: string }>(`/equipment/${id}/qrcode`),
    ]);
    setEquipment(eq.data);
    setQrCode(qr.data.qrCode);
  }

  useEffect(() => {
    load();
  }, [id]);

  // Agenda uma manutenção para este equipamento.
  async function scheduleMaintenance(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/maintenances", { ...form, equipmentId: id });
      setForm({ description: "", scheduledFor: "" });
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Erro ao agendar manutenção");
    }
  }

  // Conclui uma manutenção em aberto.
  async function completeMaintenance(maintenanceId: string) {
    setError("");
    try {
      await api.patch(`/maintenances/${maintenanceId}/complete`);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Erro ao concluir manutenção");
    }
  }

  if (!equipment) return <p className="container">Carregando...</p>;

  return (
    <div className="container">
      <button onClick={() => navigate(-1)}>← Voltar</button>
      <h1>{equipment.name}</h1>

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
        <div>
          <p>
            <strong>Tipo:</strong> {equipment.type}
          </p>
          <p>
            <strong>Nº de série:</strong> {equipment.serialNumber}
          </p>
          <p>
            <strong>Status:</strong> {equipment.status}
          </p>
        </div>

        {/* QR Code: escanear abre esta mesma ficha no celular. */}
        <div style={{ textAlign: "center" }}>
          {qrCode && <img src={qrCode} alt="QR Code do equipamento" />}
          <div style={{ fontSize: 12, color: "#888" }}>
            Escaneie para abrir a ficha
          </div>
        </div>
      </div>

      {/* Manutenções */}
      <h2>Manutenções</h2>
      {isAdmin && (
        <form
          onSubmit={scheduleMaintenance}
          style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 16 }}
        >
          <div>
            <label style={{ display: "block" }}>Descrição</label>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
            />
          </div>
          <div>
            <label style={{ display: "block" }}>Data prevista</label>
            <input
              type="date"
              value={form.scheduledFor}
              onChange={(e) => setForm({ ...form, scheduledFor: e.target.value })}
              required
            />
          </div>
          <button type="submit">Agendar manutenção</button>
        </form>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
        <thead>
          <tr style={{ textAlign: "left" }}>
            <th>Descrição</th>
            <th>Prevista para</th>
            <th>Situação</th>
            {isAdmin && <th>Ações</th>}
          </tr>
        </thead>
        <tbody>
          {equipment.maintenances.map((m) => {
            const overdue = !m.completedAt && new Date(m.scheduledFor) < new Date();
            return (
              <tr key={m.id} style={{ borderTop: "1px solid #ddd" }}>
                <td>{m.description}</td>
                <td>{new Date(m.scheduledFor).toLocaleDateString("pt-BR")}</td>
                <td style={{ color: overdue ? "crimson" : undefined }}>
                  {m.completedAt
                    ? "Concluída"
                    : overdue
                    ? "Atrasada"
                    : "Agendada"}
                </td>
                {isAdmin && (
                  <td>
                    {!m.completedAt && (
                      <button onClick={() => completeMaintenance(m.id)}>
                        Concluir
                      </button>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
          {equipment.maintenances.length === 0 && (
            <tr>
              <td colSpan={isAdmin ? 4 : 3} style={{ padding: 12, color: "#666" }}>
                Nenhuma manutenção registrada.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Histórico de posse */}
      <h2>Histórico de posse</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left" }}>
            <th>Colaborador</th>
            <th>Entregue em</th>
            <th>Devolvido em</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {equipment.assignments.map((a) => (
            <tr key={a.id} style={{ borderTop: "1px solid #ddd" }}>
              <td>{a.receiver.name}</td>
              <td>{new Date(a.assignedAt).toLocaleDateString("pt-BR")}</td>
              <td>
                {a.returnedAt
                  ? new Date(a.returnedAt).toLocaleDateString("pt-BR")
                  : "—"}
              </td>
              <td>{a.status}</td>
            </tr>
          ))}
          {equipment.assignments.length === 0 && (
            <tr>
              <td colSpan={4} style={{ padding: 12, color: "#666" }}>
                Nenhuma atribuição registrada.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
