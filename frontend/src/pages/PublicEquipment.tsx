import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Badge } from "../components/Badge";
import { Logo } from "../components/Logo";
import { Spinner } from "../components/Spinner";
import { SECTOR_LABEL, Sector } from "../lib/sectors";

// Ficha PÚBLICA do equipamento (rota /ficha/:id), aberta ao escanear o QR
// Code colado no aparelho. Não exige login e só mostra dados não sensíveis.
// Usa fetch puro de propósito: o cliente `api` tem um interceptor que
// redireciona para /login em 401 — algo indesejado numa página pública.

interface PublicEquipment {
  id: string;
  name: string;
  serialNumber: string;
  status: string;
  purchaseDate: string | null;
  warrantyUntil: string | null;
  type: { name: string };
  currentHolder: { name: string; sector: Sector | null } | null;
}

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3333/api";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-BR");
}

// Situação da garantia a partir da data de término.
function warrantyBadge(warrantyUntil: string | null) {
  if (!warrantyUntil) return <span className="muted">—</span>;
  const end = new Date(warrantyUntil);
  const now = new Date();
  const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 0) return <Badge tone="red">Garantia vencida</Badge>;
  if (days <= 30)
    return <Badge tone="amber">Vence em {days} dia(s)</Badge>;
  return <Badge tone="green">Em garantia</Badge>;
}

export function PublicEquipment() {
  const { id } = useParams<{ id: string }>();
  const [equipment, setEquipment] = useState<PublicEquipment | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/equipment/${id}/public`)
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setEquipment(data);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="public-ficha">
      <div className="public-ficha-brand">
        <Logo size={30} />
      </div>

      {notFound ? (
        <div className="panel">
          <h1 style={{ marginTop: 0 }}>Equipamento não encontrado</h1>
          <p className="muted">
            Este código não corresponde a nenhum ativo cadastrado.
          </p>
        </div>
      ) : !equipment ? (
        <p
          className="muted"
          style={{ display: "flex", alignItems: "center", gap: 8 }}
        >
          <Spinner /> Carregando ficha...
        </p>
      ) : (
        <div className="panel">
          <h1 style={{ marginTop: 0, marginBottom: 4 }}>{equipment.name}</h1>
          <p className="muted" style={{ marginTop: 0 }}>
            Ficha pública do ativo
          </p>
          <dl
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: "12px 24px",
              margin: 0,
              alignItems: "center",
            }}
          >
            <dt className="muted">Tipo</dt>
            <dd style={{ margin: 0, fontWeight: 600 }}>{equipment.type.name}</dd>
            <dt className="muted">Nº de série</dt>
            <dd style={{ margin: 0, fontWeight: 600 }}>
              {equipment.serialNumber}
            </dd>
            <dt className="muted">Status</dt>
            <dd style={{ margin: 0 }}>
              <Badge status={equipment.status} />
            </dd>
            <dt className="muted">Responsável atual</dt>
            <dd style={{ margin: 0 }}>
              {equipment.currentHolder ? (
                <>
                  {equipment.currentHolder.name}
                  {equipment.currentHolder.sector && (
                    <span className="muted">
                      {" "}
                      · {SECTOR_LABEL[equipment.currentHolder.sector]}
                    </span>
                  )}
                </>
              ) : (
                <span className="muted">Sem responsável (disponível)</span>
              )}
            </dd>
            <dt className="muted">Data de compra</dt>
            <dd style={{ margin: 0 }}>{formatDate(equipment.purchaseDate)}</dd>
            <dt className="muted">Garantia</dt>
            <dd style={{ margin: 0 }}>{warrantyBadge(equipment.warrantyUntil)}</dd>
          </dl>
        </div>
      )}

      <p className="muted" style={{ textAlign: "center", fontSize: 12 }}>
        T.I STORAGE · Gestão de Ativos de TI
      </p>
    </div>
  );
}
