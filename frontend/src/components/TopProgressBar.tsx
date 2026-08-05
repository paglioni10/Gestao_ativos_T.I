import { useEffect, useState } from "react";
import { subscribeLoading } from "../lib/api";

// Barra de progresso fixa no topo, visível sempre que houver alguma
// requisição à API em andamento — login, navegação, qualquer ação. Cobre
// o app inteiro automaticamente (alimentada pelo contador em lib/api.ts),
// sem que cada tela precise controlar seu próprio estado de carregamento.
// Importante em especial no cold start do backend (Render free), que pode
// levar dezenas de segundos: sem isso, a tela parece simplesmente travada.
export function TopProgressBar() {
  const [loading, setLoading] = useState(false);

  useEffect(() => subscribeLoading(setLoading), []);

  return (
    <div
      aria-hidden={!loading}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        zIndex: 2000,
        overflow: "hidden",
        opacity: loading ? 1 : 0,
        transition: "opacity 0.2s ease",
        pointerEvents: "none",
      }}
    >
      <div className="top-progress-bar" />
    </div>
  );
}
