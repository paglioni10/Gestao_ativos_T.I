import { AppError } from "../../lib/AppError.js";
import { prisma } from "../../lib/prisma.js";

export const equipmentTypeService = {
  // Lista os tipos em ordem alfabética.
  async list() {
    return prisma.equipmentType.findMany({ orderBy: { name: "asc" } });
  },

  // Cadastra um novo tipo (nome único, sem diferenciar maiúsc./minúsc.).
  async create(name: string) {
    const trimmed = name.trim();
    const existing = await prisma.equipmentType.findFirst({
      where: { name: { equals: trimmed, mode: "insensitive" } },
    });
    if (existing) {
      throw new AppError("Já existe um tipo com esse nome");
    }
    return prisma.equipmentType.create({ data: { name: trimmed } });
  },
};
