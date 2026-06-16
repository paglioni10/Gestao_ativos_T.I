import type { ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

// Casca da aplicação: barra de navegação fixa + área de conteúdo.
export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="topbar-brand" aria-label="Ir para a visão geral">
            <Logo />
          </Link>
          <nav className="topbar-nav">
            <NavLink to="/" end>
              Visão geral
            </NavLink>
            <NavLink to="/equipamentos">Equipamentos</NavLink>
            <NavLink to="/atribuicoes">Atribuições</NavLink>
            {user?.role === "ADMIN" && <NavLink to="/auditoria">Auditoria</NavLink>}
          </nav>
          <div className="topbar-user">
            <ThemeToggle />
            <span>{user?.name}</span>
            <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
              Sair
            </button>
          </div>
        </div>
      </header>
      <main className="page">{children}</main>
    </>
  );
}
