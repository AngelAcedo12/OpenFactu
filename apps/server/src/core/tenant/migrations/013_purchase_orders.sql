-- FASE 2: Módulo de Compras (Pedidos)

CREATE TABLE IF NOT EXISTS "{{schema}}"."PurchaseOrder" (
  "id" TEXT PRIMARY KEY,
  "seriesId" TEXT NOT NULL REFERENCES "{{schema}}"."DocumentSeries"("id"),
  "docNum" INTEGER NOT NULL,
  "periodId" TEXT NOT NULL REFERENCES "{{schema}}"."AccountingPeriod"("id"),
  "partnerId" TEXT NOT NULL REFERENCES "{{schema}}"."BusinessPartner"("id"),
  "date" TIMESTAMP NOT NULL,
  "status" TEXT DEFAULT 'O' NOT NULL,
  "total" DECIMAL(15,4) DEFAULT 0 NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "{{schema}}"."PurchaseOrderLine" (
  "id" TEXT PRIMARY KEY,
  "orderId" TEXT NOT NULL REFERENCES "{{schema}}"."PurchaseOrder"("id"),
  "lineNum" INTEGER NOT NULL,
  "itemId" TEXT NOT NULL REFERENCES "{{schema}}"."Item"("id"),
  "quantity" DECIMAL(12,4) NOT NULL,
  "price" DECIMAL(15,4) NOT NULL,
  "taxGroupId" TEXT REFERENCES "{{schema}}"."TaxGroup"("id"),
  "lineTotal" DECIMAL(15,4) NOT NULL
);
