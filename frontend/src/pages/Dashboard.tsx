import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";

interface Summary {
  equipmentByStatus: Record<string, number>;
  activeAssignments: number;
  overdueAssignments: number;
  upcomingMaintenance: number;
}

// Tela inicial com os números-resumo vindos de /dashboard/summary.
export function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    api
      .get<Summary>("/dashboard/summary")
      .then((res) => setSummary(res.data))
      .catch(() => setSummary(null));
  }, []);

  return (
    <div className="container">
      <header style={{ display: "flex", justifyContent: "space-between" }}>
        <h1>Olá, {user?.name}</h1>
        <button onClick={logout}>Sair</button>
      </header>

      <nav style={{ margin: "16px 0" }}>
        <button onClick={() => navigate("/equipamentos")}>Equipamentos</button>
      </nav>

      {summary ? (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <Card label="Atribuídos agora" value={summary.activeAssignments} />
          <Card label="Atrasados" value={summary.overdueAssignments} />
          <Card label="Manutenções próximas" value={summary.upcomingMaintenance} />
          <Card
            label="Disponíveis"
            value={summary.equipmentByStatus.AVAILABLE ?? 0}
          />
        </div>
      ) : (
        <p>Carregando métricas...</p>
      )}
    </div>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 8,
        padding: 20,
        minWidth: 160,
        boxShadow: "0 1px 3px rgba(0,0,0,.1)",
      }}
    >
      <div style={{ fontSize: 32, fontWeight: 700 }}>{value}</div>
      <div style={{ color: "#666" }}>{label}</div>
    </div>
  );
}
