-- CreateEnum
CREATE TYPE "AutomationType" AS ENUM ('LOW_STOCK');

-- CreateEnum
CREATE TYPE "AutomationChannel" AS ENUM ('EMAIL');

-- CreateTable
CREATE TABLE "Automation" (
    "id" TEXT NOT NULL,
    "type" "AutomationType" NOT NULL DEFAULT 'LOW_STOCK',
    "name" TEXT NOT NULL,
    "equipmentTypeId" TEXT NOT NULL,
    "threshold" INTEGER NOT NULL,
    "channel" "AutomationChannel" NOT NULL DEFAULT 'EMAIL',
    "recipient" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "alreadyAlerted" BOOLEAN NOT NULL DEFAULT false,
    "lastTriggeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Automation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Automation" ADD CONSTRAINT "Automation_equipmentTypeId_fkey" FOREIGN KEY ("equipmentTypeId") REFERENCES "EquipmentType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

