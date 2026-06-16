import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { authController } from "./auth.controller.js";

export const authRoutes = Router();

// POST /api/auth/register  -> cria usuário
authRoutes.post("/register", asyncHandler(authController.register));

// POST /api/auth/login     -> autentica e devolve token
authRoutes.post("/login", asyncHandler(authController.login));
