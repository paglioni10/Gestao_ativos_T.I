import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { ensureAdmin, ensureAuth } from "../../middlewares/auth.js";
import { auditController } from "./audit.controller.js";

export const auditRoutes = Router();

// GET /api/audit -> trilha de auditoria (apenas admin)
auditRoutes.get("/", ensureAuth, ensureAdmin, asyncHandler(auditController.list));
