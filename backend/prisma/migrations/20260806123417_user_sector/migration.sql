-- CreateEnum
CREATE TYPE "Sector" AS ENUM ('TI', 'MARKETING', 'COMERCIAL', 'NAILS', 'RH', 'FABRICA', 'FINANCEIRO', 'FATURAMENTO', 'DIRETORIA', 'TRADE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "sector" "Sector";

