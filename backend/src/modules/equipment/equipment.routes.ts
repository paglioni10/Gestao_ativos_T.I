import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { ensureAdmin, ensureAuth } from "../../middlewares/auth.js";
import { equipmentController } from "./equipment.controller.js";

export const equipmentRoutes = Router();

// Rota PÚBLICA (sem login): ficha read-only aberta ao escanear o QR Code
// colado no aparelho. Precisa vir ANTES do ensureAuth abaixo.
equipmentRoutes.get(
  "/:id/public",
  asyncHandler(equipmentController.publicById)
);

// Todas as demais rotas exigem login.
equipmentRoutes.use(ensureAuth);

// GET  /api/equipment        -> lista (qualquer usuário logado)
equipmentRoutes.get("/", asyncHandler(equipmentController.list));

// GET  /api/equipment/:id    -> detalhe + histórico
equipmentRoutes.get("/:id", asyncHandler(equipmentController.getById));

// GET  /api/equipment/:id/qrcode -> QR Code (data URL) da ficha do equipamento
equipmentRoutes.get("/:id/qrcode", asyncHandler(equipmentController.qrCode));

// POST /api/equipment        -> cria (apenas admin)
equipmentRoutes.post("/", ensureAdmin, asyncHandler(equipmentController.create));

// POST /api/equipment/import -> importa várias linhas de planilha (admin;
// rejeição parcial, devolve relatório de erros por linha)
equipmentRoutes.post(
  "/import",
  ensureAdmin,
  asyncHandler(equipmentController.importMany)
);

// PUT  /api/equipment/:id    -> edita dados descritivos (apenas admin)
equipmentRoutes.put("/:id", ensureAdmin, asyncHandler(equipmentController.update));

// DELETE /api/equipment/:id  -> dá baixa (status RETIRED, apenas admin)
equipmentRoutes.delete("/:id", ensureAdmin, asyncHandler(equipmentController.remove));

// DELETE /api/equipment/:id/permanent -> exclui de vez (apenas admin;
// bloqueado se estiver atribuído)
equipmentRoutes.delete(
  "/:id/permanent",
  ensureAdmin,
  asyncHandler(equipmentController.hardRemove)
);
