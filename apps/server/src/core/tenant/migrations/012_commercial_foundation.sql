-- 1. Partner Groups configuration
CREATE TABLE IF NOT EXISTS "{{schema}}"."PartnerGroup" (
  "id" TEXT PRIMARY KEY,
  "code" TEXT UNIQUE NOT NULL,
  "name" TEXT NOT NULL,
  "codePrefix" TEXT,
  "isCustomer" BOOLEAN DEFAULT FALSE NOT NULL,
  "isVendor" BOOLEAN DEFAULT FALSE NOT NULL
);

-- 2. Modify BusinessPartners dropping type and referencing groupId
ALTER TABLE "{{schema}}"."BusinessPartner" DROP COLUMN IF EXISTS "type";
ALTER TABLE "{{schema}}"."BusinessPartner" ADD COLUMN IF NOT EXISTS "groupId" TEXT REFERENCES "{{schema}}"."PartnerGroup"("id");

-- 3. Accounting configuration
CREATE TABLE IF NOT EXISTS "{{schema}}"."AccountingPeriod" (
  "id" TEXT PRIMARY KEY,
  "code" TEXT UNIQUE NOT NULL,
  "name" TEXT NOT NULL,
  "startDate" TIMESTAMP NOT NULL,
  "endDate" TIMESTAMP NOT NULL,
  "status" TEXT DEFAULT 'O' NOT NULL
);

-- 4. Document Series configuration
CREATE TABLE IF NOT EXISTS "{{schema}}"."DocumentSeries" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT UNIQUE NOT NULL,
  "description" TEXT,
  "periodId" TEXT NOT NULL REFERENCES "{{schema}}"."AccountingPeriod"("id"),
  "docType" TEXT NOT NULL,
  "firstNumber" INTEGER NOT NULL,
  "nextNumber" INTEGER NOT NULL,
  "lastNumber" INTEGER NOT NULL,
  "prefix" TEXT,
  "suffix" TEXT,
  "isDefault" BOOLEAN DEFAULT FALSE NOT NULL
);
