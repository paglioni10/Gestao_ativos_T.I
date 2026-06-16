import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { router } from "./routes.js";

export const app = express();

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());

// Healthcheck simples — útil pra verificar se a API está no ar.
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Todas as rotas da aplicação ficam sob /api
app.use("/api", router);

// Middleware de erro precisa ser o último.
app.use(errorHandler);
