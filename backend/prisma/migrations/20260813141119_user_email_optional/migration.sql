-- E-mail passa a ser opcional (colaboradores que não logam podem não ter).
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;
