-- AlterEnum
BEGIN;
CREATE TYPE "Sector_new" AS ENUM ('TI', 'MARKETING', 'COMERCIAL', 'NAILS', 'RH', 'PRODUCAO_AB', 'FINANCEIRO', 'DIRETORIA', 'TRADE', 'EDUCACIONAL', 'FISCAL', 'PRODUCAO_NAILS', 'INSIDE_SALES', 'COMEX');
ALTER TABLE "User" ALTER COLUMN "sector" TYPE "Sector_new" USING ("sector"::text::"Sector_new");
ALTER TYPE "Sector" RENAME TO "Sector_old";
ALTER TYPE "Sector_new" RENAME TO "Sector";
DROP TYPE "public"."Sector_old";
COMMIT;

