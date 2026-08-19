import { Request, Response } from "express";
import { z } from "zod";
import { auditService } from "./audit.service.js";

// Todas as ações registráveis na trilha, disponíveis para filtrar por tipo.
const AUDIT_ACTIONS = [
  "EQUIPMENT_CREATED",
  "EQUIPMENT_UPDATED",
  "EQUIPMENT_RETIRED",
  "EQUIPMENT_DELETED",
  "EQUIPMENT_RELEASED_USER_DELETED",
  "ASSIGNMENT_CREATED",
  "ASSIGNMENT_RETURNED",
  "MAINTENANCE_SCHEDULED",
  "MAINTENANCE_COMPLETED",
  "CREDENTIAL_CREATED",
  "CREDENTIAL_REVEALED",
  "CREDENTIAL_DELETED",
  "USER_CREATED",
  "USER_DELETED",
  "USER_PASSWORD_RESET",
  "PASSWORD_RESET_REQUESTED",
  "AUTOMATION_CREATED",
  "AUTOMATION_UPDATED",
  "AUTOMATION_DELETED",
  "AUTOMATION_TRIGGERED",
] as const;

const SECTORS = [
  "TI",
  "MARKETING",
  "COMERCIAL",
  "NAILS",
  "RH",
  "PRODUCAO_AB",
  "FINANCEIRO",
  "DIRETORIA",
  "TRADE",
  "EDUCACIONAL",
  "FISCAL",
  "PRODUCAO_NAILS",
  "INSIDE_SALES",
  "COMEX",
] as const;

const listQuerySchema = z.object({
  typeId: z.string().uuid().optional(),
  period: z.enum(["week", "month", "semester", "year"]).optional(),
  action: z.enum(AUDIT_ACTIONS).optional(),
  sector: z.enum(SECTORS).optional(),
  // Quantos registros retornar (paginação "carregar mais"). Limitado para
  // proteger o servidor.
  limit: z.coerce.number().int().min(1).max(5000).optional(),
});

export const auditController = {
  async list(req: Request, res: Response) {
    const { typeId, period, action, sector, limit } = listQuerySchema.parse(
      req.query
    );
    const logs = await auditService.list(typeId, period, action, sector, limit);
    return res.json(logs);
  },
};
