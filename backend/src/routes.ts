import { Router } from "express";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { equipmentRoutes } from "./modules/equipment/equipment.routes.js";
import { assignmentRoutes } from "./modules/assignment/assignment.routes.js";
import { userRoutes } from "./modules/user/user.routes.js";
import { dashboardRoutes } from "./modules/dashboard/dashboard.routes.js";
import { auditRoutes } from "./modules/audit/audit.routes.js";

// Agregador central de rotas. Cada módulo registra seu próprio prefixo.
export const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/equipment", equipmentRoutes);
router.use("/assignments", assignmentRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/audit", auditRoutes);
