-- AlterEnum
BEGIN;
CREATE TYPE "AssignmentStatus_new" AS ENUM ('ACTIVE', 'RETURNED');
ALTER TABLE "public"."Assignment" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Assignment" ALTER COLUMN "status" TYPE "AssignmentStatus_new" USING ("status"::text::"AssignmentStatus_new");
ALTER TYPE "AssignmentStatus" RENAME TO "AssignmentStatus_old";
ALTER TYPE "AssignmentStatus_new" RENAME TO "AssignmentStatus";
DROP TYPE "public"."AssignmentStatus_old";
ALTER TABLE "Assignment" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

