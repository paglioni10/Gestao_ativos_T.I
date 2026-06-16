import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Popula o banco com um usuário admin inicial para você conseguir logar.
// Rode com: npm run seed
async function main() {
  const email = "admin@empresa.com";
  const passwordHash = await bcrypt.hash("admin123", 10);

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name: "Administrador",
      email,
      passwordHash,
      role: "ADMIN",
    },
  });

  console.log(`✅ Admin criado: ${email} / senha: admin123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
