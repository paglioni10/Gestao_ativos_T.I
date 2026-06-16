import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function getInitial(): Theme {
  return (localStorage.getItem("theme") as Theme) || "light";
}

// Botão que alterna entre tema claro e escuro, persistindo no localStorage.
// O tema é aplicado no <html> via data-theme, lido pelo index.css.
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getInitial);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <button
      className="btn btn-ghost btn-sm"
      onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
      title="Alternar tema"
      aria-label="Alternar tema"
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
