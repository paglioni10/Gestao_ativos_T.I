import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { ensureAdmin, ensureAuth } from "../../middlewares/auth.js";
import { automationController } from "./automation.controller.js";

export const automationRoutes = Router();

// Automações são governança — restritas a administradores.
automationRoutes.use(ensureAuth, ensureAdmin);

// GET    /api/automations       -> lista
automationRoutes.get("/", asyncHandler(automationController.list));

// POST   /api/automations       -> cria
automationRoutes.post("/", asyncHandler(automationController.create));

// PUT    /api/automations/:id   -> edita (limite, destinatário, nome, ativo)
automationRoutes.put("/:id", asyncHandler(automationController.update));

// POST   /api/automations/:id/test-email -> envia e-mail de teste
automationRoutes.post(
  "/:id/test-email",
  asyncHandler(automationController.sendTest)
);

// DELETE /api/automations/:id   -> exclui
automationRoutes.delete("/:id", asyncHandler(automationController.remove));
