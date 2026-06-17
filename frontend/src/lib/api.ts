import axios from "axios";

// Cliente HTTP central. Todas as chamadas à API passam por aqui.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3333/api",
});

// Antes de cada requisição, anexa o token JWT (se houver) no header.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Se a sessão for inválida/expirada (401), limpa o login e volta para a tela
// de entrada — evita ficar com um token velho causando erros.
api.interceptors.response.use(
  (response) => response,
  (error) => {
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
