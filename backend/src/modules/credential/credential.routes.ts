import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { ensureAdmin, ensureAuth } from "../../middlewares/auth.js";
import { credentialController } from "./credential.controller.js";

export const credentialRoutes = Router();

// O cofre é restrito a administradores em TODAS as rotas.
credentialRoutes.use(ensureAuth, ensureAdmin);

// GET    /api/credentials?equipmentId=...  -> lista (sem o segredo)
credentialRoutes.get("/", asyncHandler(credentialController.list));

// POST   /api/credentials                  -> cria (cifra o segredo)
credentialRoutes.post("/", asyncHandler(credentialController.create));

// GET    /api/credentials/:id/reveal       -> revela o segredo (auditado)
credentialRoutes.get("/:id/reveal", asyncHandler(credentialController.reveal));

// DELETE /api/credentials/:id              -> remove
credentialRoutes.delete("/:id", asyncHandler(credentialController.remove));
