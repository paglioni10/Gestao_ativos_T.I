-- AlterEnum
ALTER TYPE "AutomationType" ADD VALUE 'MAINTENANCE_DUE';

-- DropForeignKey
ALTER TABLE "Automation" DROP CONSTRAINT "Automation_equipmentTypeId_fkey";

-- AlterTable
ALTER TABLE "Automation" ADD COLUMN     "leadDays" INTEGER,
ALTER COLUMN "equipmentTypeId" DROP NOT NULL,
ALTER COLUMN "threshold" DROP NOT NULL;

-- CreateTable
CREATE TABLE "MaintenanceReminder" (
    "id" TEXT NOT NULL,
    "automationId" TEXT NOT NULL,
    "maintenanceRecordId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenanceReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceReminder_automationId_maintenanceRecordId_kind_key" ON "MaintenanceReminder"("automationId", "maintenanceRecordId", "kind");

-- AddForeignKey
ALTER TABLE "Automation" ADD CONSTRAINT "Automation_equipmentTypeId_fkey" FOREIGN KEY ("equipmentTypeId") REFERENCES "EquipmentType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceReminder" ADD CONSTRAINT "MaintenanceReminder_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "Automation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceReminder" ADD CONSTRAINT "MaintenanceReminder_maintenanceRecordId_fkey" FOREIGN KEY ("maintenanceRecordId") REFERENCES "MaintenanceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
