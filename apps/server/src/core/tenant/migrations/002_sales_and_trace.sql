-- 4. Cabeceras de Documentos
CREATE TABLE IF NOT EXISTS "{{schema}}"."OrderHeader" (
  "id" TEXT PRIMARY KEY,
  "docNum" INTEGER UNIQUE NOT NULL,
  "date" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "partnerId" TEXT NOT NULL REFERENCES "{{schema}}"."BusinessPartner"("id"),
  "status" TEXT DEFAULT 'O',
  "total" DECIMAL(12,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS "{{schema}}"."DeliveryHeader" (
  "id" TEXT PRIMARY KEY,
  "docNum" INTEGER UNIQUE NOT NULL,
  "date" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "partnerId" TEXT NOT NULL REFERENCES "{{schema}}"."BusinessPartner"("id"),
  "status" TEXT DEFAULT 'O',
  "total" DECIMAL(12,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS "{{schema}}"."InvoiceHeader" (
  "id" TEXT PRIMARY KEY,
  "docNum" INTEGER UNIQUE NOT NULL,
  "date" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "partnerId" TEXT NOT NULL REFERENCES "{{schema}}"."BusinessPartner"("id"),
  "status" TEXT DEFAULT 'O',
  "total" DECIMAL(12,2) NOT NULL
);

-- 5. Líneas de Documentos
CREATE TABLE IF NOT EXISTS "{{schema}}"."OrderLine" (
  "id" TEXT PRIMARY KEY,
  "orderId" TEXT NOT NULL REFERENCES "{{schema}}"."OrderHeader"("id"),
  "lineNum" INTEGER NOT NULL,
  "itemId" TEXT NOT NULL REFERENCES "{{schema}}"."Item"("id"),
  "description" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL,
  "openQty" DOUBLE PRECISION NOT NULL,
  "uomId" TEXT NOT NULL REFERENCES "{{schema}}"."UnitOfMeasure"("id"),
  "price" DECIMAL(12,4) NOT NULL,
  "taxGroupId" TEXT NOT NULL REFERENCES "{{schema}}"."TaxGroup"("id")
);

-- 6. Distribución de Traza
CREATE TABLE IF NOT EXISTS "{{schema}}"."DocumentLineDist" (
  "id" TEXT PRIMARY KEY,
  "orderLineId" TEXT REFERENCES "{{schema}}"."OrderLine"("id"),
  "batchId" TEXT REFERENCES "{{schema}}"."ItemBatch"("id"),
  "serialId" TEXT REFERENCES "{{schema}}"."ItemSerial"("id"),
  "quantity" DOUBLE PRECISION DEFAULT 1
);
