import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { ensureAdmin, ensureAuth } from "../../middlewares/auth.js";
import { ensureCronSecret } from "../../middlewares/cronAuth.js";
import { automationController } from "./automation.controller.js";

export const automationRoutes = Router();

// Endpoint do cron externo (GitHub Actions): checagem diária dos prazos de
// manutenção. Fica ANTES do middleware de JWT — é protegido pelo segredo
// compartilhado (header x-cron-secret), não por login.
// POST /api/automations/cron/maintenance-checks
automationRoutes.post(
  "/cron/maintenance-checks",
  ensureCronSecret,
  asyncHandler(automationController.runMaintenanceChecks)
);

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
