-- 1. Maestros Independientes
CREATE TABLE IF NOT EXISTS "{{schema}}"."UnitOfMeasure" (
  "id" TEXT PRIMARY KEY,
  "code" TEXT UNIQUE NOT NULL,
  "name" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "{{schema}}"."Category" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "parentId" TEXT REFERENCES "{{schema}}"."Category"("id"),
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "{{schema}}"."PriceList" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "{{schema}}"."TaxGroup" (
  "id" TEXT PRIMARY KEY,
  "code" TEXT UNIQUE NOT NULL,
  "rate" DECIMAL(5,2) NOT NULL
);

-- 2. Socios y Artículos
CREATE TABLE IF NOT EXISTS "{{schema}}"."BusinessPartner" (
  "id" TEXT PRIMARY KEY,
  "code" TEXT UNIQUE NOT NULL,
  "name" TEXT NOT NULL,
  "nif" TEXT UNIQUE NOT NULL,
  "type" TEXT DEFAULT 'C',
  "priceListId" TEXT REFERENCES "{{schema}}"."PriceList"("id")
);

CREATE TABLE IF NOT EXISTS "{{schema}}"."Item" (
  "id" TEXT PRIMARY KEY,
  "code" TEXT UNIQUE NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "uomId" TEXT NOT NULL REFERENCES "{{schema}}"."UnitOfMeasure"("id"),
  "categoryId" TEXT REFERENCES "{{schema}}"."Category"("id"),
  "manageBy" TEXT DEFAULT 'N',
  "basePrice" DECIMAL(12,4) NOT NULL,
  "stock" DOUBLE PRECISION DEFAULT 0,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Traza (Series y Lotes)
CREATE TABLE IF NOT EXISTS "{{schema}}"."ItemBatch" (
  "id" TEXT PRIMARY KEY,
  "batchNum" TEXT NOT NULL,
  "itemId" TEXT NOT NULL REFERENCES "{{schema}}"."Item"("id"),
  "quantity" DOUBLE PRECISION DEFAULT 0,
  "expiryDate" TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "{{schema}}"."ItemSerial" (
  "id" TEXT PRIMARY KEY,
  "serialNum" TEXT UNIQUE NOT NULL,
  "itemId" TEXT NOT NULL REFERENCES "{{schema}}"."Item"("id"),
  "status" TEXT DEFAULT 'A'
);
