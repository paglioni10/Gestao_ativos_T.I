import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Logo } from "../components/Logo";
import { useAuth } from "../contexts/AuthContext";

// Tela de login centralizada.
export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@empresa.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
      navigate("/");
    } catch {
      setError("E-mail ou senha inválidos");
    }
  }

  return (
    <div className="center-screen">
      <div className="panel" style={{ width: 360, marginBottom: 0 }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
            marginBottom: 20,
          }}
        >
          <Logo size={44} />
          <p className="muted">Gestão de Ativos de TI</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>
          <div className="field" style={{ marginBottom: 16 }}>
            <label>Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>
          {error && <p className="alert-error">{error}</p>}
          <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
