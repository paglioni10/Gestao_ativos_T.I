import { prisma } from "../../lib/prisma.js";

export const dashboardService = {
  async summary() {
    const now = new Date();

    const [
      byStatus,
      activeAssignments,
      upcomingMaintenance,
      overdueMaintenance,
      maintenanceEquipment,
      overdueEquipment,
      availableByTypeRaw,
      equipmentTypes,
      activeReceivers,
    ] = await Promise.all([
      prisma.equipment.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.assignment.count({ where: { status: "ACTIVE" } }),
      prisma.maintenanceRecord.count({
        where: { completedAt: null, scheduledFor: { gte: now } },
      }),
      prisma.maintenanceRecord.count({
        where: { completedAt: null, scheduledFor: { lt: now } },
      }),
      // Equipamentos com manutenção agendada (ainda não atrasada) — para a lista da caixa "Em manutenção".
      prisma.maintenanceRecord.findMany({
        where: { completedAt: null, scheduledFor: { gte: now } },
        orderBy: { scheduledFor: "asc" },
        include: {
          equipment: { select: { id: true, name: true, serialNumber: true, type: { select: { name: true } } } },
        },
      }),
      // Equipamentos com manutenção atrasada — para a lista da caixa "Manutenções atrasadas".
      prisma.maintenanceRecord.findMany({
        where: { completedAt: null, scheduledFor: { lt: now } },
        orderBy: { scheduledFor: "asc" },
        include: {
          equipment: { select: { id: true, name: true, serialNumber: true, type: { select: { name: true } } } },
        },
      }),
      // Disponíveis (AVAILABLE) agrupados por tipo — para a lista da caixa "Disponíveis".
      prisma.equipment.groupBy({
        by: ["typeId"],
        where: { status: "AVAILABLE" },
        _count: { _all: true },
      }),
      prisma.equipmentType.findMany({ select: { id: true, name: true } }),
      // Setor de cada colaborador com atribuição ativa — para a distribuição
      // por setor da caixa "Atribuídos agora".
      prisma.assignment.findMany({
        where: { status: "ACTIVE" },
        select: { receiver: { select: { sector: true } } },
      }),
    ]);

    const equipmentByStatus = Object.fromEntries(
      byStatus.map((row) => [row.status, row._count._all])
    );

    // Monta { tipo, quantidade } só dos tipos que têm ao menos 1 disponível,
    // em ordem decrescente de quantidade.
    const typeNameById = new Map(equipmentTypes.map((t) => [t.id, t.name]));
    const availableByType = availableByTypeRaw
      .map((row) => ({
        type: typeNameById.get(row.typeId) ?? "—",
        count: row._count._all,
      }))
      .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type, "pt-BR"));

    // Distribuição das atribuições ativas por setor do colaborador, com %.
    const totalActive = activeReceivers.length;
    const bySectorCount = new Map<string, number>();
    for (const a of activeReceivers) {
      const key = a.receiver.sector ?? "SEM_SETOR";
      bySectorCount.set(key, (bySectorCount.get(key) ?? 0) + 1);
    }
    const assignedBySector = [...bySectorCount.entries()]
      .map(([sector, count]) => ({
        sector,
        count,
        pct: totalActive > 0 ? Math.round((count / totalActive) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count || a.sector.localeCompare(b.sector));

    return {
      equipmentByStatus,
      activeAssignments,
      upcomingMaintenance,
      overdueMaintenance,
      availableByType,
      assignedBySector,
      maintenanceEquipment: maintenanceEquipment.map((m) => ({
        id: m.equipment.id,
        name: m.equipment.name,
        type: m.equipment.type.name,
        serialNumber: m.equipment.serialNumber,
        scheduledFor: m.scheduledFor,
      })),
      overdueEquipment: overdueEquipment.map((m) => ({
        id: m.equipment.id,
        name: m.equipment.name,
        type: m.equipment.type.name,
        serialNumber: m.equipment.serialNumber,
        scheduledFor: m.scheduledFor,
        daysLate: Math.max(1, Math.floor((now.getTime() - m.scheduledFor.getTime()) / 86400000)),
      })),
    };
  },
};
