import type { Sector } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

export type AuditPeriod = "week" | "month" | "semester" | "year";

// Calcula o início do período informado (semana começa na segunda-feira).
function periodStart(period: AuditPeriod): Date {
  const now = new Date();
  switch (period) {
    case "week": {
      const day = now.getDay(); // 0 = domingo, 1 = segunda, ...
      const diffToMonday = day === 0 ? 6 : day - 1;
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      d.setDate(d.getDate() - diffToMonday);
      return d;
    }
    case "month":
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case "semester": {
      const startMonth = now.getMonth() < 6 ? 0 : 6;
      return new Date(now.getFullYear(), startMonth, 1);
    }
    case "year":
      return new Date(now.getFullYear(), 0, 1);
  }
}

export const auditService = {
  // Lista os registros mais recentes da trilha de auditoria.
  // - typeId: filtra os eventos ligados a equipamentos daquele tipo.
  // - action: filtra por um tipo de ação específico (ex: criação de
  //   usuário), para eventos que não envolvem diretamente um equipamento.
  // - period: filtra por janela de tempo (semana/mês/semestre/ano atual).
  async list(typeId?: string, period?: AuditPeriod, action?: string, sector?: Sector) {
    return prisma.auditLog.findMany({
      where: {
        ...(typeId ? { equipment: { typeId } } : {}),
        ...(action ? { action } : {}),
        ...(period ? { createdAt: { gte: periodStart(period) } } : {}),
        ...(sector ? { performedBy: { sector } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        performedBy: { select: { name: true, sector: true } },
        equipment: {
          select: {
            name: true,
            serialNumber: true,
            type: { select: { name: true } },
          },
        },
      },
    });
  },
};
