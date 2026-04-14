-- FASE 3: Maestro de Interlocutores Avanzado y Direcciones

-- 1. Ampliar BusinessPartner
ALTER TABLE "{{schema}}"."BusinessPartner" ADD COLUMN IF NOT EXISTS "foreignName" TEXT;
ALTER TABLE "{{schema}}"."BusinessPartner" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "{{schema}}"."BusinessPartner" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "{{schema}}"."BusinessPartner" ADD COLUMN IF NOT EXISTS "website" TEXT;

-- 2. Direcciones de Interlocutores
CREATE TABLE IF NOT EXISTS "{{schema}}"."PartnerAddress" (
  "id" TEXT PRIMARY KEY,
  "partnerId" TEXT NOT NULL REFERENCES "{{schema}}"."BusinessPartner"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "street" TEXT,
  "city" TEXT,
  "state" TEXT,
  "zipCode" TEXT,
  "country" TEXT,
  "type" TEXT DEFAULT 'B' NOT NULL,
  "isDefault" BOOLEAN DEFAULT FALSE NOT NULL
);

-- 3. Ampliar PurchaseOrder con Direcciones Snapshots
ALTER TABLE "{{schema}}"."PurchaseOrder" ADD COLUMN IF NOT EXISTS "billToAddress" TEXT;
ALTER TABLE "{{schema}}"."PurchaseOrder" ADD COLUMN IF NOT EXISTS "shipToAddress" TEXT;
