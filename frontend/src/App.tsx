import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { AuthProvider } from "./contexts/AuthContext";
import { Assignments } from "./pages/Assignments";
import { Audit } from "./pages/Audit";
import { Dashboard } from "./pages/Dashboard";
import { Equipment } from "./pages/Equipment";
import { EquipmentDetail } from "./pages/EquipmentDetail";
import { Login } from "./pages/Login";

// Define o mapa de rotas da aplicação.
export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Rotas protegidas: compartilham a casca (AppLayout). */}
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/equipamentos" element={<Equipment />} />
            <Route path="/equipamentos/:id" element={<EquipmentDetail />} />
            <Route path="/atribuicoes" element={<Assignments />} />
            <Route path="/auditoria" element={<Audit />} />
          </Route>

          {/* Qualquer rota desconhecida volta para a home. */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
