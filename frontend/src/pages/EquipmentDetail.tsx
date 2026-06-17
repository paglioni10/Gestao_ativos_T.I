import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Badge } from "../components/Badge";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";

interface Maintenance {
  id: string;
  description: string;
  scheduledFor: string;
  completedAt: string | null;
}

interface Credential {
  id: string;
  label: string;
  username: string | null;
  createdAt: string;
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

  // Cofre de senhas
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [credForm, setCredForm] = useState({ label: "", username: "", secret: "" });
  const [revealed, setRevealed] = useState<Record<string, string>>({});

  async function load() {
    const [eq, qr] = await Promise.all([
      api.get<EquipmentDetail>(`/equipment/${id}`),
      api.get<{ qrCode: string }>(`/equipment/${id}/qrcode`),
    ]);
    setEquipment(eq.data);
    setQrCode(qr.data.qrCode);
    if (isAdmin) {
      const cred = await api.get<Credential[]>("/credentials", {
        params: { equipmentId: id },
      });
      setCredentials(cred.data);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

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

  async function completeMaintenance(maintenanceId: string) {
    setError("");
    try {
      await api.patch(`/maintenances/${maintenanceId}/complete`);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Erro ao concluir manutenção");
    }
  }

  async function addCredential(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/credentials", { ...credForm, equipmentId: id });
      setCredForm({ label: "", username: "", secret: "" });
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Erro ao salvar credencial");
    }
  }

  async function revealCredential(credId: string) {
    setError("");
    try {
      const res = await api.get<{ secret: string }>(`/credentials/${credId}/reveal`);
      setRevealed((prev) => ({ ...prev, [credId]: res.data.secret }));
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Erro ao revelar senha");
    }
  }

  function hideCredential(credId: string) {
    setRevealed((prev) => {
      const next = { ...prev };
      delete next[credId];
      return next;
    });
  }

  async function deleteCredential(credId: string) {
    if (!confirm("Remover esta credencial?")) return;
    setError("");
    try {
      await api.delete(`/credentials/${credId}`);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Erro ao remover credencial");
    }
  }

  if (!equipment) return <p className="muted">Carregando...</p>;

  return (
    <div>
      <button type="button" className="back-link" onClick={() => navigate(-1)}>
        ← Voltar
      </button>
      <h1>{equipment.name}</h1>

      {error && <p className="alert-error">{error}</p>}

      <div className="panel" style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
        <div style={{ display: "grid", gap: 6, alignContent: "start" }}>
          <div>
            <span className="muted">Tipo: </span>
            {equipment.type}
          </div>
          <div>
            <span className="muted">Nº de série: </span>
            {equipment.serialNumber}
          </div>
          <div>
            <span className="muted">Status: </span>
            <Badge status={equipment.status} />
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          {qrCode && <img src={qrCode} alt="QR Code do equipamento" width={140} />}
          <div className="muted">Escaneie para abrir a ficha</div>
        </div>
      </div>

      {/* Manutenções */}
      <h2>Manutenções</h2>
      {isAdmin && (
        <form className="panel" onSubmit={scheduleMaintenance}>
          <div className="form-row">
            <div className="field">
              <label htmlFor="mt-description">Descrição</label>
              <input
                id="mt-description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="mt-date">Data prevista</label>
              <input
                id="mt-date"
                type="date"
                value={form.scheduledFor}
                onChange={(e) => setForm({ ...form, scheduledFor: e.target.value })}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Agendar manutenção
            </button>
          </div>
        </form>
      )}

      <div className="panel" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Descrição</th>
              <th scope="col">Prevista para</th>
              <th scope="col">Situação</th>
              {isAdmin && <th scope="col">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {equipment.maintenances.map((m) => {
              const overdue = !m.completedAt && new Date(m.scheduledFor) < new Date();
              return (
                <tr key={m.id}>
                  <td>{m.description}</td>
                  <td>{new Date(m.scheduledFor).toLocaleDateString("pt-BR")}</td>
                  <td>
                    {m.completedAt ? (
                      <Badge tone="green">Concluída</Badge>
                    ) : overdue ? (
                      <Badge tone="red">Atrasada</Badge>
                    ) : (
                      <Badge tone="blue">Agendada</Badge>
                    )}
                  </td>
                  {isAdmin && (
                    <td>
                      {!m.completedAt && (
                        <button
                          className="btn btn-sm"
                          onClick={() => completeMaintenance(m.id)}
                        >
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
                <td colSpan={isAdmin ? 4 : 3} className="empty">
                  Nenhuma manutenção registrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Cofre de senhas (somente admin) */}
      {isAdmin && (
        <>
          <h2>🔐 Cofre de senhas</h2>
          <p className="muted">
            Senhas do aparelho (BIOS, conta do SO, PIN). Armazenadas criptografadas;
            cada revelação fica registrada na auditoria.
          </p>

          <form className="panel" onSubmit={addCredential}>
            <div className="form-row">
              <div className="field">
                <label htmlFor="cred-label">Rótulo</label>
                <input
                  id="cred-label"
                  value={credForm.label}
                  onChange={(e) => setCredForm({ ...credForm, label: e.target.value })}
                  placeholder="Senha BIOS"
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="cred-username">Usuário (opcional)</label>
                <input
                  id="cred-username"
                  value={credForm.username}
                  onChange={(e) =>
                    setCredForm({ ...credForm, username: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="cred-secret">Senha</label>
                <input
                  id="cred-secret"
                  type="password"
                  value={credForm.secret}
                  onChange={(e) =>
                    setCredForm({ ...credForm, secret: e.target.value })
                  }
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary">
                Salvar no cofre
              </button>
            </div>
          </form>

          <div className="panel" style={{ padding: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Rótulo</th>
                  <th scope="col">Usuário</th>
                  <th scope="col">Senha</th>
                  <th scope="col">Ações</th>
                </tr>
              </thead>
              <tbody>
                {credentials.map((c) => (
                  <tr key={c.id}>
                    <td>{c.label}</td>
                    <td>{c.username ?? "—"}</td>
                    <td>
                      {revealed[c.id] ? (
                        <code>{revealed[c.id]}</code>
                      ) : (
                        <span className="muted">••••••••</span>
                      )}
                    </td>
                    <td>
                      {revealed[c.id] ? (
                        <button className="btn btn-sm" onClick={() => hideCredential(c.id)}>
                          Ocultar
                        </button>
                      ) : (
                        <button
                          className="btn btn-sm"
                          onClick={() => revealCredential(c.id)}
                        >
                          Revelar
                        </button>
                      )}
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => deleteCredential(c.id)}
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
                {credentials.length === 0 && (
                  <tr>
                    <td colSpan={4} className="empty">
                      Nenhuma senha cadastrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Histórico de posse */}
      <h2>Histórico de posse</h2>
      <div className="panel" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Colaborador</th>
              <th scope="col">Entregue em</th>
              <th scope="col">Devolvido em</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {equipment.assignments.map((a) => (
              <tr key={a.id}>
                <td>{a.receiver.name}</td>
                <td>{new Date(a.assignedAt).toLocaleDateString("pt-BR")}</td>
                <td>
                  {a.returnedAt
                    ? new Date(a.returnedAt).toLocaleDateString("pt-BR")
                    : "—"}
                </td>
                <td>
                  <Badge status={a.status} />
                </td>
              </tr>
            ))}
            {equipment.assignments.length === 0 && (
              <tr>
                <td colSpan={4} className="empty">
                  Nenhuma atribuição registrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
