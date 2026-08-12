-- Nº de série passa a ser opcional (regra por tipo decide se é exigido).
ALTER TABLE "Equipment" ALTER COLUMN "serialNumber" DROP NOT NULL;

-- Regra por tipo: exigir ou não nº de série (padrão: exigir).
ALTER TABLE "EquipmentType" ADD COLUMN "serialRequired" BOOLEAN NOT NULL DEFAULT true;

-- Backfill: Periférico e Outro não exigem nº de série.
UPDATE "EquipmentType" SET "serialRequired" = false WHERE name IN ('Periférico', 'Outro');
