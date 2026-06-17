-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED');

-- CreateTable
CREATE TABLE "PasswordRequest" (
    "id" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "equipmentId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "resolvedById" TEXT,

    CONSTRAINT "PasswordRequest_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PasswordRequest" ADD CONSTRAINT "PasswordRequest_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordRequest" ADD CONSTRAINT "PasswordRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordRequest" ADD CONSTRAINT "PasswordRequest_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

