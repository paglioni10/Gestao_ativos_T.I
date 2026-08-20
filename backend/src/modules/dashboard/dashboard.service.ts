import { prisma } from "../../lib/prisma.js";

// Rótulos dos setores (mesmos exibidos no frontend).
const SECTOR_LABELS: Record<string, string> = {
  COMERCIAL: "Field Sales",
  COMEX: "Comex",
  DIRETORIA: "Diretoria",
  EDUCACIONAL: "Educacional",
  FINANCEIRO: "Financeiro",
  FISCAL: "Fiscal",
  INSIDE_SALES: "Inside Sales",
  MARKETING: "Marketing",
  NAILS: "Nails",
  PRODUCAO_AB: "Produção",
  PRODUCAO_NAILS: "Produção Nails",
  RH: "RH",
  TI: "T.I",
  TRADE: "Trade",
};

const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
});

export const dashboardService = {
  async summary() {
    const now = new Date();

    const [
      byStatus,
      maintenanceRecs,
      overdueRecs,
      availableByTypeRaw,
      equipmentTypes,
      activeReceivers,
    ] = await Promise.all([
      prisma.equipment.groupBy({ by: ["status"], _count: { _all: true } }),
      // Manutenções agendadas (ainda não atrasadas).
      prisma.maintenanceRecord.findMany({
        where: { completedAt: null, scheduledFor: { gte: now } },
        orderBy: { scheduledFor: "asc" },
        include: {
          equipment: {
            select: { id: true, name: true, serialNumber: true, type: { select: { name: true } } },
          },
        },
      }),
      // Manutenções atrasadas.
      prisma.maintenanceRecord.findMany({
        where: { completedAt: null, scheduledFor: { lt: now } },
        orderBy: { scheduledFor: "asc" },
        include: {
          equipment: {
            select: { id: true, name: true, serialNumber: true, type: { select: { name: true } } },
          },
        },
      }),
      // Disponíveis por tipo.
      prisma.equipment.groupBy({
        by: ["typeId"],
        where: { status: "AVAILABLE" },
        _count: { _all: true },
      }),
      prisma.equipmentType.findMany({ select: { id: true, name: true } }),
      // Setor de cada colaborador com atribuição ativa.
      prisma.assignment.findMany({
        where: { status: "ACTIVE" },
        select: { receiver: { select: { sector: true } } },
      }),
    ]);

    const eqStatus = Object.fromEntries(
      byStatus.map((row) => [row.status, row._count._all])
    ) as Record<string, number>;
    const available = eqStatus.AVAILABLE ?? 0;
    const assigned = eqStatus.ASSIGNED ?? 0;
    const maintenance = eqStatus.MAINTENANCE ?? 0;
    const retired = eqStatus.RETIRED ?? 0;
    const total = available + assigned + maintenance + retired;
    const upcomingMaintenance = maintenanceRecs.length;
    const overdue = overdueRecs.length;

    const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
    const availablePct = pct(available);

    // Composição do total por status (sem "Baixado").
    const totalRows = [
      { name: "Disponível", count: available, pct: pct(available), tone: "green" as const },
      { name: "Atribuído", count: assigned, pct: pct(assigned), tone: "gray" as const },
      { name: "Manutenção", count: maintenance, pct: pct(maintenance), tone: "amber" as const },
    ];

    // Disponíveis por tipo (só tipos com ao menos 1), decrescente.
    const typeNameById = new Map(equipmentTypes.map((t) => [t.id, t.name]));
    const availableRows = availableByTypeRaw
      .map((row) => ({ name: typeNameById.get(row.typeId) ?? "—", count: row._count._all }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt-BR"));

    // Distribuição das atribuições ativas por setor, com %.
    const totalActive = activeReceivers.length;
    const bySector = new Map<string, number>();
    for (const a of activeReceivers) {
      const key = a.receiver.sector ?? "SEM_SETOR";
      bySector.set(key, (bySector.get(key) ?? 0) + 1);
    }
    const assignedRows = [...bySector.entries()]
      .map(([sector, count]) => ({
        name: sector === "SEM_SETOR" ? "Sem setor" : SECTOR_LABELS[sector] ?? sector,
        count,
        pct: totalActive > 0 ? Math.round((count / totalActive) * 100) : 0,
        tone: "gray" as const,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt-BR"));

    // Linhas de equipamento (manutenção agendada e atrasada).
    const maintenanceRows = maintenanceRecs.map((m) => ({
      name: m.equipment.name,
      detail: `${m.equipment.type.name} · SN ${m.equipment.serialNumber || "—"} · agendada para ${dateFmt.format(m.scheduledFor)}`,
      tag: "Manutenção",
    }));

    const overdueRows = overdueRecs.map((m) => {
      const daysLate = Math.max(
        1,
        Math.floor((now.getTime() - m.scheduledFor.getTime()) / 86400000)
      );
      return {
        name: m.equipment.name,
        nameAlert: true,
        detail: `${m.equipment.type.name} · SN ${m.equipment.serialNumber || "—"} · atrasada há ${daysLate} dia(s)`,
        detailAlert: true,
        tag: "Atrasado",
      };
    });

    return {
      total,
      available,
      assigned,
      maintenance,
      overdue,
      totalDetail: `${available} disponíveis · ${assigned} em uso`,
      availableDetail: `${availablePct}% do inventário prontos para entrega`,
      assignedDetail: "em poder de colaboradores",
      maintenanceDetail: `${upcomingMaintenance} manutenção(ões) agendada(s)`,
      overdueDetail: "requerem atenção imediata",
      totalRows,
      availableRows,
      assignedRows,
      maintenanceRows,
      overdueRows,
    };
  },
};
