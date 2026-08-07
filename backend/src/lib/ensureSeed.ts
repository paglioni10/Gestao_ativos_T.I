import bcrypt from "bcryptjs";
import { prisma } from "./prisma.js";

// Garante os dados iniciais (admin + tipos) ao subir a API. É idempotente:
// se já existirem, não altera nada. Útil em produção (Render Free não tem
// Shell para rodar o seed manualmente). Usa apenas dependências de produção.
export async function ensureSeed() {
  const email = "ti@americanburrs.com";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    const passwordHash = await bcrypt.hash("admin123", 10);
    await prisma.user.create({
      data: {
        name: "Administrador",
        email,
        passwordHash,
        role: "ADMIN",
        sector: "TI",
        jobTitle: "ADM T.I",
      },
    });
    console.log(`✅ Admin padrão criado: ${email} / admin123`);
  } else if (!existing.sector) {
    // Backfill: garantir que o admin antigo tenha um setor válido.
    await prisma.user.update({ where: { id: existing.id }, data: { sector: "TI" } });
  }

  const tipos = ["Notebook", "Desktop", "Monitor", "Celular", "Periférico", "Outro"];
  for (const name of tipos) {
    await prisma.equipmentType.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
}
