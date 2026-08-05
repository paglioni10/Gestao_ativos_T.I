import axios from "axios";

// Cliente HTTP central. Todas as chamadas à API passam por aqui.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3333/api",
});

// Contador de requisições em andamento, para alimentar a barra de progresso
// global (TopProgressBar). Qualquer chamada via `api` é rastreada aqui,
// então nenhuma tela precisa lidar com isso individualmente — ela some
// sozinha, mesmo quando o backend demora para "acordar" (cold start).
let pending = 0;
type LoadingListener = (isLoading: boolean) => void;
const listeners = new Set<LoadingListener>();

function setPending(delta: number) {
  pending = Math.max(0, pending + delta);
  const isLoading = pending > 0;
  listeners.forEach((cb) => cb(isLoading));
}

export function subscribeLoading(cb: LoadingListener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// Antes de cada requisição, anexa o token JWT (se houver) no header.
api.interceptors.request.use(
  (config) => {
    setPending(1);
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    setPending(-1);
    return Promise.reject(error);
  }
);

// Ao final de cada requisição (sucesso ou erro), destrava a barra de
// progresso. Também trata sessão inválida/expirada (401): limpa o login e
// volta para a tela de entrada, evitando ficar com um token velho causando
// erros.
api.interceptors.response.use(
  (response) => {
    setPending(-1);
    return response;
  },
  (error) => {
    setPending(-1);
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// Extrai uma mensagem de erro legível de uma resposta da API. Quando o erro
// é de validação (422, "Dados inválidos"), inclui o motivo específico de
// cada campo em vez de mostrar só o texto genérico.
export function getErrorMessage(err: any, fallback: string): string {
  const data = err?.response?.data;
  if (!data) return fallback;
  if (data.issues) {
    const details = Object.values(data.issues as Record<string, string[]>)
      .flat()
      .join(" ");
    return details || data.message || fallback;
  }
  return data.message ?? fallback;
}
