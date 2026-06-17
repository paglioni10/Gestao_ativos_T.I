import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "hc";

// Ordem do ciclo ao clicar e metadados de cada tema.
const ORDER: Theme[] = ["light", "dark", "hc"];
const META: Record<Theme, { icon: string; label: string }> = {
  light: { icon: "☀️", label: "Tema claro" },
  dark: { icon: "🌙", label: "Tema escuro" },
  hc: { icon: "◐", label: "Alto contraste" },
};

function getInitial(): Theme {
  const t = localStorage.getItem("theme");
  return t === "dark" || t === "hc" || t === "light" ? t : "light";
}

// Botão que alterna entre claro, escuro e alto contraste, persistindo a
// escolha no localStorage. O tema é aplicado no <html> via data-theme.
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getInitial);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  function cycle() {
    setTheme((t) => ORDER[(ORDER.indexOf(t) + 1) % ORDER.length]);
  }

  const meta = META[theme];
  return (
    <button
      className="btn btn-ghost btn-sm"
      onClick={cycle}
      title={`${meta.label} — clique para alternar`}
      aria-label={`Tema atual: ${meta.label}. Clique para alternar o tema.`}
    >
      {meta.icon}
    </button>
  );
}
