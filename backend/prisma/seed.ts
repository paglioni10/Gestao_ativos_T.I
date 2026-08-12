import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Popula o banco com um usuário admin inicial para você conseguir logar.
// Rode com: npm run seed
async function main() {
  const email = "ti@americanburrs.com";
  const passwordHash = await bcrypt.hash("admin123", 10);

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name: "Administrador",
      email,
      passwordHash,
      role: "ADMIN",
      sector: "TI",
      jobTitle: "ADM T.I",
    },
  });

  console.log(`✅ Admin criado: ${email} / senha: admin123`);

  // Tipos de equipamento padrão (em português). Novos podem ser cadastrados
  // pela própria aplicação.
  const tipos: { name: string; serialRequired: boolean }[] = [
    { name: "Notebook", serialRequired: true },
    { name: "Desktop", serialRequired: true },
    { name: "Monitor", serialRequired: true },
    { name: "Celular", serialRequired: true },
    { name: "Periférico", serialRequired: false },
    { name: "Outro", serialRequired: false },
  ];
  for (const { name, serialRequired } of tipos) {
    await prisma.equipmentType.upsert({
      where: { name },
      update: {},
      create: { name, serialRequired },
    });
  }
  console.log(`✅ ${tipos.length} tipos de equipamento criados`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
