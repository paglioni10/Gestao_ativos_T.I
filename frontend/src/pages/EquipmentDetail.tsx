import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Badge } from "../components/Badge";
import { useConfirm } from "../components/ConfirmDialog";
import { PasswordInput } from "../components/PasswordInput";
import { Spinner } from "../components/Spinner";
import { useAuth } from "../contexts/AuthContext";
import { api, getErrorMessage } from "../lib/api";
import { SECTOR_LABEL, Sector } from "../lib/sectors";

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
  receiver: { id: string; name: string; sector: Sector | null };
}

interface EquipmentDetail {
  id: string;
  name: string;
  type: { name: string };
  serialNumber: string;
  status: string;
  purchaseDate: string | null;
  warrantyUntil: string | null;
  notes: string | null;
  assignments: AssignmentLite[];
  maintenances: Maintenance[];
}

export function EquipmentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const { confirm } = useConfirm();

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
      setError(getErrorMessage(err, "Erro ao agendar manutenção"));
    }
  }

  async function completeMaintenance(maintenanceId: string) {
    setError("");
    try {
      await api.patch(`/maintenances/${maintenanceId}/complete`);
      await load();
    } catch (err: any) {
      setError(getErrorMessage(err, "Erro ao concluir manutenção"));
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
      setError(getErrorMessage(err, "Erro ao salvar credencial"));
    }
  }

  async function revealCredential(credId: string) {
    setError("");
    try {
      const res = await api.get<{ secret: string }>(`/credentials/${credId}/reveal`);
      setRevealed((prev) => ({ ...prev, [credId]: res.data.secret }));
    } catch (err: any) {
      setError(getErrorMessage(err, "Erro ao revelar senha"));
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
    const ok = await confirm({
      title: "Remover credencial",
      message: "Deseja remover esta credencial?",
      confirmText: "Remover",
    });
    if (!ok) return;
    setError("");
    try {
      await api.delete(`/credentials/${credId}`);
      await load();
    } catch (err: any) {
      setError(getErrorMessage(err, "Erro ao remover credencial"));
    }
  }

  if (!equipment)
    return (
      <p className="muted" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Spinner /> Carregando ficha do equipamento...
      </p>
    );

  // Colaborador que está com o aparelho agora (atribuição ativa), se houver.
  const activeAssignment = equipment.assignments.find((a) => a.status === "ACTIVE");

  return (
    <div>
      <button type="button" className="back-link" onClick={() => navigate(-1)}>
        ← Voltar
      </button>
      <h1>{equipment.name}</h1>

      {error && <p className="alert-error">{error}</p>}

      <div
        className="panel"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 32,
          flexWrap: "wrap",
        }}
      >
        <dl
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: "12px 24px",
            margin: 0,
            flex: 1,
            minWidth: 240,
            alignItems: "center",
          }}
        >
          <dt className="muted">Tipo</dt>
          <dd style={{ margin: 0, fontWeight: 600 }}>{equipment.type.name}</dd>
          <dt className="muted">Nº de série</dt>
          <dd style={{ margin: 0, fontWeight: 600 }}>{equipment.serialNumber}</dd>
          <dt className="muted">Status</dt>
          <dd style={{ margin: 0 }}>
            <Badge status={equipment.status} />
          </dd>
          <dt className="muted">Responsável atual</dt>
          <dd style={{ margin: 0 }}>
            {activeAssignment ? (
              <>
                {activeAssignment.receiver.name}
                {activeAssignment.receiver.sector && (
                  <span className="muted">
                    {" "}
                    · {SECTOR_LABEL[activeAssignment.receiver.sector]}
                  </span>
                )}
              </>
            ) : (
              <span className="muted">Sem responsável (disponível)</span>
            )}
          </dd>
          {equipment.notes && (
            <>
              <dt className="muted">Observações</dt>
              <dd style={{ margin: 0 }}>{equipment.notes}</dd>
            </>
          )}
        </dl>
        <div style={{ textAlign: "center", flexShrink: 0 }}>
          {qrCode && <img src={qrCode} alt="QR Code do equipamento" width={150} />}
          <div className="muted" style={{ fontSize: 12 }}>
            Escaneie para abrir a ficha pública
          </div>
        </div>
      </div>

      {/* Manutenções */}
      <h2>Manutenções</h2>
      {isAdmin && (
        <form className="panel" onSubmit={scheduleMaintenance}>
          <div className="form-row fill">
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
            <div className="form-row fill">
              <div className="field">
                <label htmlFor="cred-label">Rótulo</label>
                <input
                  id="cred-label"
                  value={credForm.label}
                  onChange={(e) => setCredForm({ ...credForm, label: e.target.value })}
                  placeholder="Ex.: Senha BIOS"
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
                <PasswordInput
                  id="cred-secret"
                  value={credForm.secret}
                  onChange={(v) => setCredForm({ ...credForm, secret: v })}
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
