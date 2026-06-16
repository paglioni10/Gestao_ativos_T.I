import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { ensureAuth } from "../../middlewares/auth.js";
import { dashboardController } from "./dashboard.controller.js";

export const dashboardRoutes = Router();

dashboardRoutes.use(ensureAuth);

// GET /api/dashboard/summary -> métricas-resumo
dashboardRoutes.get("/summary", asyncHandler(dashboardController.summary));
