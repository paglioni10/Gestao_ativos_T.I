import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Logo } from "../components/Logo";
import { PasswordInput } from "../components/PasswordInput";
import { Spinner } from "../components/Spinner";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";

// Tela de login centralizada.
export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // "Esqueci minha senha"
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMessage, setForgotMessage] = useState("");
  const [forgotSubmitting, setForgotSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err: any) {
      // Distingue credencial inválida (401) de falha de conexão/servidor,
      // para não mascarar problemas de rede como "senha errada".
      if (err?.response?.status === 401) {
        setError("E-mail ou senha inválidos");
      } else if (err?.response) {
        setError("Erro no servidor. Tente novamente em instantes.");
      } else {
        setError("Não foi possível conectar ao servidor.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForgot(e: FormEvent) {
    e.preventDefault();
    setForgotMessage("");
    setForgotSubmitting(true);
    try {
      const res = await api.post("/auth/forgot-password", { email: forgotEmail });
      setForgotMessage(res.data.message);
    } catch {
      setForgotMessage("Não foi possível registrar o pedido. Tente novamente.");
    } finally {
      setForgotSubmitting(false);
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

        {!showForgot ? (
          <>
            <form onSubmit={handleSubmit}>
              <div className="field" style={{ marginBottom: 12 }}>
                <label htmlFor="login-email">E-mail</label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>
              <div className="field" style={{ marginBottom: 8 }}>
                <label htmlFor="login-password">Senha</label>
                <PasswordInput
                  id="login-password"
                  autoComplete="current-password"
                  value={password}
                  onChange={setPassword}
                />
              </div>
              <div style={{ textAlign: "right", marginBottom: 16 }}>
                <button
                  type="button"
                  className="back-link"
                  style={{ fontSize: 13, marginBottom: 0 }}
                  onClick={() => {
                    setShowForgot(true);
                    setForgotEmail(email);
                    setForgotMessage("");
                  }}
                >
                  Esqueci minha senha
                </button>
              </div>
              {error && <p className="alert-error">{error}</p>}
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: "100%", display: "flex", justifyContent: "center", gap: 8 }}
                disabled={submitting}
              >
                {submitting && <Spinner />}
                {submitting ? "Entrando..." : "Entrar"}
              </button>
              {submitting && (
                <p className="muted" style={{ textAlign: "center", marginTop: 10, fontSize: 13 }}>
                  Isso pode levar alguns segundos se o servidor estiver iniciando.
                </p>
              )}
            </form>
          </>
        ) : (
          <form onSubmit={handleForgot}>
            <p className="muted" style={{ marginTop: 0 }}>
              Informe seu e-mail. Um administrador será notificado e definirá
              uma nova senha para você.
            </p>
            <div className="field" style={{ marginBottom: 16 }}>
              <label htmlFor="forgot-email">E-mail</label>
              <input
                id="forgot-email"
                type="email"
                autoComplete="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                style={{ width: "100%" }}
                required
              />
            </div>
            {forgotMessage && (
              <p
                className="alert-error"
                style={{
                  background: "var(--green-bg)",
                  color: "var(--green-fg)",
                }}
              >
                {forgotMessage}
              </p>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="btn"
                style={{ flex: 1 }}
                onClick={() => setShowForgot(false)}
                disabled={forgotSubmitting}
              >
                Voltar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 1, display: "flex", justifyContent: "center", gap: 8 }}
                disabled={forgotSubmitting}
              >
                {forgotSubmitting && <Spinner />}
                {forgotSubmitting ? "Enviando..." : "Enviar pedido"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
