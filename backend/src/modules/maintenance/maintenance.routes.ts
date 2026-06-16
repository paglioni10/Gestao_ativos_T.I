import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { ensureAdmin, ensureAuth } from "../../middlewares/auth.js";
import { maintenanceController } from "./maintenance.controller.js";

export const maintenanceRoutes = Router();

maintenanceRoutes.use(ensureAuth);

// GET   /api/maintenances              -> lista (qualquer logado)
maintenanceRoutes.get("/", asyncHandler(maintenanceController.list));

// POST  /api/maintenances              -> agenda manutenção (admin)
maintenanceRoutes.post("/", ensureAdmin, asyncHandler(maintenanceController.create));

// PATCH /api/maintenances/:id/complete -> conclui manutenção (admin)
maintenanceRoutes.patch(
  "/:id/complete",
  ensureAdmin,
  asyncHandler(maintenanceController.complete)
);
