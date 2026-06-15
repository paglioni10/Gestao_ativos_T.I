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
