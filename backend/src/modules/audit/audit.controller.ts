import { Request, Response } from "express";
import { z } from "zod";
import { auditService } from "./audit.service.js";

// Ações que não envolvem diretamente um equipamento, mas ainda assim
// podem ser filtradas na trilha de auditoria.
const NON_EQUIPMENT_ACTIONS = [
  "USER_CREATED",
  "USER_DELETED",
  "CREDENTIAL_CREATED",
  "PASSWORD_RESET_REQUESTED",
] as const;

const SECTORS = [
  "TI",
  "MARKETING",
  "COMERCIAL",
  "NAILS",
  "RH",
  "FABRICA",
  "FINANCEIRO",
  "FATURAMENTO",
  "DIRETORIA",
  "TRADE",
] as const;

const listQuerySchema = z.object({
  typeId: z.string().uuid().optional(),
  period: z.enum(["week", "month", "semester", "year"]).optional(),
  action: z.enum(NON_EQUIPMENT_ACTIONS).optional(),
  sector: z.enum(SECTORS).optional(),
});

export const auditController = {
  async list(req: Request, res: Response) {
    const { typeId, period, action, sector } = listQuerySchema.parse(req.query);
    const logs = await auditService.list(typeId, period, action, sector);
    return res.json(logs);
  },
};
