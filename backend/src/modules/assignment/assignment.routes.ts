import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { ensureAdmin, ensureAuth } from "../../middlewares/auth.js";
import { assignmentController } from "./assignment.controller.js";

export const assignmentRoutes = Router();

assignmentRoutes.use(ensureAuth);

// GET  /api/assignments            -> lista todas as atribuições
assignmentRoutes.get("/", asyncHandler(assignmentController.list));

// POST /api/assignments            -> registra entrega (admin)
assignmentRoutes.post("/", ensureAdmin, asyncHandler(assignmentController.create));

// PATCH /api/assignments/:id/return -> registra devolução (admin)
assignmentRoutes.patch(
  "/:id/return",
  ensureAdmin,
  asyncHandler(assignmentController.returnEquipment)
);

// GET /api/assignments/:id/term -> baixa o PDF do termo (qualquer logado)
assignmentRoutes.get("/:id/term", asyncHandler(assignmentController.downloadTerm));
