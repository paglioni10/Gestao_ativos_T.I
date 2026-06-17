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
