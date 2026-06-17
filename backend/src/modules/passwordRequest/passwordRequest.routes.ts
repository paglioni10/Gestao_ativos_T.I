import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { ensureAdmin, ensureAuth } from "../../middlewares/auth.js";
import { passwordRequestController } from "./passwordRequest.controller.js";

export const passwordRequestRoutes = Router();

passwordRequestRoutes.use(ensureAuth);

// POST /api/password-requests        -> colaborador solicita acesso
passwordRequestRoutes.post("/", asyncHandler(passwordRequestController.create));

// GET  /api/password-requests/mine   -> minhas solicitações (colaborador)
passwordRequestRoutes.get("/mine", asyncHandler(passwordRequestController.mine));

// GET  /api/password-requests/:id/secrets -> senhas (se solicitação aprovada)
passwordRequestRoutes.get(
  "/:id/secrets",
  asyncHandler(passwordRequestController.secrets)
);

// GET  /api/password-requests        -> todas (admin)
passwordRequestRoutes.get(
  "/",
  ensureAdmin,
  asyncHandler(passwordRequestController.list)
);

// PATCH /api/password-requests/:id   -> aprovar/negar (admin)
passwordRequestRoutes.patch(
  "/:id",
  ensureAdmin,
  asyncHandler(passwordRequestController.resolve)
);
