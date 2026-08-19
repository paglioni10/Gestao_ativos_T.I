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
    ]);

    const equipmentByStatus = Object.fromEntries(
      byStatus.map((row) => [row.status, row._count._all])
    );

    return {
      equipmentByStatus,
      activeAssignments,
      upcomingMaintenance,
      overdueMaintenance,
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
