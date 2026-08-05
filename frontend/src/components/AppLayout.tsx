import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Layout } from "./Layout";
import { Logo } from "./Logo";
import { Spinner } from "./Spinner";

// Guarda de autenticação + casca visual para as rotas protegidas.
// Se não houver usuário logado, redireciona para o login.
export function AppLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <Logo size={36} withText={false} />
        <Spinner />
        <span>Carregando sua sessão...</span>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}
