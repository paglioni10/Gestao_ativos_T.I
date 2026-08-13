import bcrypt from "bcryptjs";
import type { Role, Sector } from "@prisma/client";
import { AppError } from "../../lib/AppError.js";
import { recordAudit } from "../../lib/audit.js";
import { prisma } from "../../lib/prisma.js";

interface CreateUserInput {
  name: string;
  email?: string;
  password: string;
  role: Role;
  jobTitle: string;
  sector: Sector;
}

export const userService = {
  // Lista usuários ativos, expondo apenas campos públicos (nunca o
  // passwordHash). Usuários excluídos (active=false) não aparecem aqui.
  async list() {
    return prisma.user.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        jobTitle: true,
        sector: true,
        createdAt: true,
      },
      orderBy: { name: "asc" },
    });
  },

  // Cria um usuário (ação administrativa). O admin define o papel e o cargo.
  async create(
    { name, email, password, role, jobTitle, sector }: CreateUserInput,
    performedById: string
  ) {
    const cleanEmail = email?.trim() || null;
    if (cleanEmail) {
      const existing = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });
      if (existing) {
        throw new AppError("E-mail já cadastrado");
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email: cleanEmail, passwordHash, role, jobTitle, sector },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        jobTitle: true,
        sector: true,
        createdAt: true,
      },
    });

    await recordAudit({
      action: "USER_CREATED",
      entity: "User",
      entityId: user.id,
      performedById,
      metadata: { email: cleanEmail, role, jobTitle, sector },
    });
    return user;
  },

  // Importa vários colaboradores de uma planilha (rejeição parcial). Cada
  // linha é validada e criada individualmente; as válidas entram, as
  // inválidas voltam num relatório com o motivo. Setor e Papel vêm por
  // nome/rótulo e são casados com os valores válidos (ignora acento/caixa).
  async importMany(
    rows: {
      name?: string;
      email?: string;
      jobTitle?: string;
      sector?: string;
      role?: string;
      password?: string;
    }[],
    performedById: string
  ) {
    const norm = (s: string) =>
      s
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "");

    // Aceita tanto o valor do enum quanto o rótulo exibido no sistema.
    const sectorMap: Record<string, Sector> = {};
    const sectorLabels: { value: Sector; label: string }[] = [
      { value: "COMERCIAL", label: "Field Sales" },
      { value: "COMEX", label: "Comex" },
      { value: "DIRETORIA", label: "Diretoria" },
      { value: "EDUCACIONAL", label: "Educacional" },
      { value: "FATURAMENTO", label: "Faturamento" },
      { value: "FINANCEIRO", label: "Financeiro" },
      { value: "FISCAL", label: "Fiscal" },
      { value: "INSIDE_SALES", label: "Inside Sales" },
      { value: "MARKETING", label: "Marketing" },
      { value: "NAILS", label: "Nails" },
      { value: "PRODUCAO_AB", label: "Produção AB" },
      { value: "PRODUCAO_NAILS", label: "Produção Nails" },
      { value: "RH", label: "RH" },
      { value: "TI", label: "T.I" },
      { value: "TRADE", label: "Trade" },
    ];
    for (const { value, label } of sectorLabels) {
      sectorMap[norm(value)] = value;
      sectorMap[norm(label)] = value;
    }

    const resolveRole = (raw: string): Role | null => {
      const n = norm(raw);
      if (!n) return "COLLABORATOR"; // padrão quando não informado
      if (["admin", "administrador"].includes(n)) return "ADMIN";
      if (["colaborador", "collaborator"].includes(n)) return "COLLABORATOR";
      return null;
    };

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const DEFAULT_PASSWORD = "American@!";

    let created = 0;
    const errors: { line: number; message: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const line = i + 2; // linha 1 = cabeçalho
      const row = rows[i];
      const name = (row.name ?? "").trim();
      const email = (row.email ?? "").trim();
      const jobTitle = (row.jobTitle ?? "").trim();
      const sectorRaw = (row.sector ?? "").trim();
      const roleRaw = (row.role ?? "").trim();
      const password = (row.password ?? "").trim() || DEFAULT_PASSWORD;

      // Linha totalmente vazia é ignorada.
      if (!name && !email && !jobTitle && !sectorRaw) continue;

      if (name.length < 2) {
        errors.push({ line, message: "Nome deve ter no mínimo 2 caracteres" });
        continue;
      }
      if (email && !emailRe.test(email)) {
        errors.push({ line, message: "E-mail inválido" });
        continue;
      }
      if (jobTitle.length < 2) {
        errors.push({ line, message: "Cargo deve ter no mínimo 2 caracteres" });
        continue;
      }
      const sector = sectorMap[norm(sectorRaw)];
      if (!sector) {
        errors.push({
          line,
          message: `Setor "${sectorRaw || "(vazio)"}" não é válido`,
        });
        continue;
      }
      const role = resolveRole(roleRaw);
      if (!role) {
        errors.push({
          line,
          message: `Papel "${roleRaw}" inválido (use Administrador ou Colaborador)`,
        });
        continue;
      }
      if (role === "ADMIN" && !email) {
        errors.push({ line, message: "E-mail é obrigatório para administradores" });
        continue;
      }
      if (password.length < 6) {
        errors.push({ line, message: "Senha deve ter no mínimo 6 caracteres" });
        continue;
      }

      try {
        await this.create(
          { name, email, password, role, jobTitle, sector },
          performedById
        );
        created++;
      } catch (err) {
        errors.push({
          line,
          message: err instanceof AppError ? err.message : "Erro ao cadastrar",
        });
      }
    }

    return { created, errors, total: rows.length };
  },

  // Redefine a senha de um usuário (admin), tipicamente em resposta a um
  // pedido de "esqueci minha senha". A nova senha é comunicada por fora
  // (Teams, presencial etc.) — o projeto não tem envio de e-mail.
  async resetPassword(id: string, newPassword: string, performedById: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new AppError("Usuário não encontrado", 404);
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id }, data: { passwordHash } });

    await recordAudit({
      action: "USER_PASSWORD_RESET",
      entity: "User",
      entityId: id,
      performedById,
    });
  },

  // "Exclui" um usuário (baixa lógica: active=false — ver comentário no
  // schema). Qualquer equipamento atribuído a ele fica disponível de novo,
  // e cada liberação é auditada individualmente.
  async remove(id: string, performedById: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || !user.active) {
      throw new AppError("Usuário não encontrado", 404);
    }
    if (id === performedById) {
      throw new AppError("Você não pode excluir sua própria conta");
    }
    if (user.role === "ADMIN") {
      const otherAdmins = await prisma.user.count({
        where: { role: "ADMIN", active: true, id: { not: id } },
      });
      if (otherAdmins === 0) {
        throw new AppError("Não é possível excluir o único administrador");
      }
    }

    const activeAssignments = await prisma.assignment.findMany({
      where: { receiverId: id, status: "ACTIVE" },
      include: { equipment: { select: { id: true, name: true } } },
    });

    // As duas escritas (fechar atribuição + liberar equipamento + desativar
    // usuário) precisam ser atômicas, como em qualquer outra transação do app.
    await prisma.$transaction(async (tx) => {
      for (const assignment of activeAssignments) {
        await tx.assignment.update({
          where: { id: assignment.id },
          data: { status: "RETURNED", returnedAt: new Date() },
        });
        await tx.equipment.update({
          where: { id: assignment.equipmentId },
          data: { status: "AVAILABLE" },
        });
      }
      await tx.user.update({ where: { id }, data: { active: false } });
    });

    for (const assignment of activeAssignments) {
      await recordAudit({
        action: "EQUIPMENT_RELEASED_USER_DELETED",
        entity: "Equipment",
        entityId: assignment.equipmentId,
        equipmentId: assignment.equipmentId,
        performedById,
        metadata: { equipmentName: assignment.equipment.name, userName: user.name },
      });
    }

    await recordAudit({
      action: "USER_DELETED",
      entity: "User",
      entityId: id,
      performedById,
      metadata: { name: user.name, email: user.email, releasedCount: activeAssignments.length },
    });
  },
};
