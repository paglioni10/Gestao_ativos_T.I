import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { ensureAdmin, ensureAuth } from "../../middlewares/auth.js";
import { equipmentController } from "./equipment.controller.js";

export const equipmentRoutes = Router();

// Todas as rotas exigem login.
equipmentRoutes.use(ensureAuth);

// GET  /api/equipment        -> lista (qualquer usuário logado)
equipmentRoutes.get("/", asyncHandler(equipmentController.list));

// GET  /api/equipment/:id    -> detalhe + histórico
equipmentRoutes.get("/:id", asyncHandler(equipmentController.getById));

// POST /api/equipment        -> cria (apenas admin)
equipmentRoutes.post("/", ensureAdmin, asyncHandler(equipmentController.create));

// PUT  /api/equipment/:id    -> edita dados descritivos (apenas admin)
equipmentRoutes.put("/:id", ensureAdmin, asyncHandler(equipmentController.update));

// DELETE /api/equipment/:id  -> dá baixa (status RETIRED, apenas admin)
equipmentRoutes.delete("/:id", ensureAdmin, asyncHandler(equipmentController.remove));
