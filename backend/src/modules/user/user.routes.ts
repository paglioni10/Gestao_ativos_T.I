import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { ensureAdmin, ensureAuth } from "../../middlewares/auth.js";
import { userController } from "./user.controller.js";

export const userRoutes = Router();

// Listar usuários é uma ação administrativa.
userRoutes.get("/", ensureAuth, ensureAdmin, asyncHandler(userController.list));
