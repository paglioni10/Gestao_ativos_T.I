import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { ensureAdmin, ensureAuth } from "../../middlewares/auth.js";
import { equipmentTypeController } from "./equipmentType.controller.js";

export const equipmentTypeRoutes = Router();

equipmentTypeRoutes.use(ensureAuth);

// GET  /api/equipment-types -> lista (qualquer logado)
equipmentTypeRoutes.get("/", asyncHandler(equipmentTypeController.list));

// POST /api/equipment-types -> cadastra novo tipo (admin)
equipmentTypeRoutes.post(
  "/",
  ensureAdmin,
  asyncHandler(equipmentTypeController.create)
);
