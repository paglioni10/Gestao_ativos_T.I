import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { ensureAdmin, ensureAuth } from "../../middlewares/auth.js";
import { passwordResetRequestController } from "./passwordResetRequest.controller.js";

export const passwordResetRequestRoutes = Router();

// Toda a gestão de pedidos de redefinição é restrita a administradores.
passwordResetRequestRoutes.use(ensureAuth, ensureAdmin);

// GET   /api/password-reset-requests       -> lista pedidos (pendentes primeiro)
passwordResetRequestRoutes.get(
  "/",
  asyncHandler(passwordResetRequestController.list)
);

// PATCH /api/password-reset-requests/:id   -> define nova senha e resolve
passwordResetRequestRoutes.patch(
  "/:id",
  asyncHandler(passwordResetRequestController.resolve)
);
