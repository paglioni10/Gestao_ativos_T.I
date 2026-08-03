-- CreateEnum
CREATE TYPE "ResetRequestStatus" AS ENUM ('PENDING', 'RESOLVED');

-- DropForeignKey
ALTER TABLE "PasswordRequest" DROP CONSTRAINT "PasswordRequest_equipmentId_fkey";

-- DropForeignKey
ALTER TABLE "PasswordRequest" DROP CONSTRAINT "PasswordRequest_requesterId_fkey";

-- DropForeignKey
ALTER TABLE "PasswordRequest" DROP CONSTRAINT "PasswordRequest_resolvedById_fkey";

-- DropTable
DROP TABLE "PasswordRequest";

-- DropEnum
DROP TYPE "RequestStatus";

-- CreateTable
CREATE TABLE "PasswordResetRequest" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" "ResetRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "resolvedById" TEXT,

    CONSTRAINT "PasswordResetRequest_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PasswordResetRequest" ADD CONSTRAINT "PasswordResetRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetRequest" ADD CONSTRAINT "PasswordResetRequest_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

