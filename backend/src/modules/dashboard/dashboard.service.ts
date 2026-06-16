import { prisma } from "../../lib/prisma.js";

export const dashboardService = {
  // Métricas-resumo para a tela inicial. Mostra que o sistema é uma
  // ferramenta de GESTÃO, não só um cadastro.
  async summary() {
    const now = new Date();

    const [byStatus, activeAssignments, overdueAssignments, upcomingMaintenance] =
      await Promise.all([
        // Contagem de equipamentos agrupada por status.
        prisma.equipment.groupBy({
          by: ["status"],
          _count: { _all: true },
        }),
        // Equipamentos atualmente em poder de alguém.
        prisma.assignment.count({ where: { status: "ACTIVE" } }),
        // Atribuições marcadas como atrasadas.
        prisma.assignment.count({ where: { status: "OVERDUE" } }),
        // Manutenções programadas e ainda não concluídas.
        prisma.maintenanceRecord.count({
          where: { completedAt: null, scheduledFor: { gte: now } },
        }),
      ]);

    // Transforma o groupBy em um objeto { AVAILABLE: n, ASSIGNED: n, ... }
    const equipmentByStatus = Object.fromEntries(
      byStatus.map((row) => [row.status, row._count._all])
    );

    return {
      equipmentByStatus,
      activeAssignments,
      overdueAssignments,
      upcomingMaintenance,
    };
  },
};
