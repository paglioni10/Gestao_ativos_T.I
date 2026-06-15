import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

interface Equipment {
  id: string;
  name: string;
  type: string;
  serialNumber: string;
  status: string;
}

// Lista de equipamentos consumindo GET /equipment.
export function Equipment() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Equipment[]>([]);

  useEffect(() => {
    api.get<Equipment[]>("/equipment").then((res) => setItems(res.data));
  }, []);

  return (
    <div className="container">
      <button onClick={() => navigate("/")}>← Voltar</button>
      <h1>Equipamentos</h1>

      {/* TODO: formulário de cadastro (apenas admin) e ação de entrega/devolução */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left" }}>
            <th>Nome</th>
            <th>Tipo</th>
            <th>Nº de série</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} style={{ borderTop: "1px solid #ddd" }}>
              <td>{item.name}</td>
              <td>{item.type}</td>
              <td>{item.serialNumber}</td>
              <td>{item.status}</td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={4} style={{ padding: 16, color: "#666" }}>
                Nenhum equipamento cadastrado ainda.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
