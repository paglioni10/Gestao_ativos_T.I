import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { ensureAdmin, ensureAuth } from "../../middlewares/auth.js";
import { userController } from "./user.controller.js";

export const userRoutes = Router();

// Gestão de usuários é restrita a administradores (governança).
userRoutes.use(ensureAuth, ensureAdmin);

// GET  /api/users -> lista usuários
userRoutes.get("/", asyncHandler(userController.list));

// POST /api/users -> cria usuário (admin define o papel)
userRoutes.post("/", asyncHandler(userController.create));

// POST /api/users/import -> cadastro em massa via planilha (rejeição parcial)
userRoutes.post("/import", asyncHandler(userController.importMany));

// PATCH /api/users/:id/password -> redefine a senha de um usuário
userRoutes.patch("/:id/password", asyncHandler(userController.resetPassword));

// DELETE /api/users/:id -> exclui usuário (libera equipamentos atribuídos)
userRoutes.delete("/:id", asyncHandler(userController.remove));
