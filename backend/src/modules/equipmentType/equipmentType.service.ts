import { AppError } from "../../lib/AppError.js";
import { prisma } from "../../lib/prisma.js";

export const equipmentTypeService = {
  // Lista os tipos em ordem alfabética.
  async list() {
    return prisma.equipmentType.findMany({ orderBy: { name: "asc" } });
  },

  // Cadastra um novo tipo (nome único, sem diferenciar maiúsc./minúsc.).
  // serialRequired define se equipamentos deste tipo exigem nº de série.
  async create(name: string, serialRequired: boolean) {
    const trimmed = name.trim();
    const existing = await prisma.equipmentType.findFirst({
      where: { name: { equals: trimmed, mode: "insensitive" } },
    });
    if (existing) {
      throw new AppError("Já existe um tipo com esse nome");
    }
    return prisma.equipmentType.create({ data: { name: trimmed, serialRequired } });
  },

  // Exclui um tipo. Bloqueado se algum equipamento (mesmo baixado) ainda
  // referenciar esse tipo — apagar quebraria o registro histórico.
  async remove(id: string) {
    const type = await prisma.equipmentType.findUnique({ where: { id } });
    if (!type) {
      throw new AppError("Tipo não encontrado", 404);
    }
    const inUse = await prisma.equipment.count({ where: { typeId: id } });
    if (inUse > 0) {
      throw new AppError(
        `Não é possível excluir: existem ${inUse} equipamento(s) cadastrado(s) com o tipo "${type.name}".`
      );
    }
    await prisma.equipmentType.delete({ where: { id } });
  },
};
