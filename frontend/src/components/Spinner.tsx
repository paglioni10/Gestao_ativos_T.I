import type { CSSProperties } from "react";

// Spinner simples (CSS), para usar dentro de botões ou telas de carregamento.
export function Spinner({ style }: { style?: CSSProperties }) {
  return <span className="spinner" style={style} aria-hidden="true" />;
}
