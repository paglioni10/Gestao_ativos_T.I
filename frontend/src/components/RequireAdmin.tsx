import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

// Guarda de rota para áreas restritas a administradores. Quem não for admin
// é redirecionado para a visão geral (defesa no front; o backend também
// bloqueia via ensureAdmin).
export function RequireAdmin() {
  const { user } = useAuth();
  if (user?.role !== "ADMIN") {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
