-- FASE 4: Ciclo Completo de Compras y Trazabilidad

-- 1. Modificar Item (Stock Mínimo)
ALTER TABLE "{{schema}}"."Item" ADD COLUMN IF NOT EXISTS "minStock" DOUBLE PRECISION DEFAULT 0 NOT NULL;

-- 2. Modificar PurchaseOrder / Lines (Trazabilidad y Almacén)
ALTER TABLE "{{schema}}"."PurchaseOrder" ADD COLUMN IF NOT EXISTS "warehouseId" TEXT REFERENCES "{{schema}}"."Warehouse"("id");
ALTER TABLE "{{schema}}"."PurchaseOrderLine" ADD COLUMN IF NOT EXISTS "warehouseId" TEXT REFERENCES "{{schema}}"."Warehouse"("id");
ALTER TABLE "{{schema}}"."PurchaseOrderLine" ADD COLUMN IF NOT EXISTS "batchNum" TEXT;
ALTER TABLE "{{schema}}"."PurchaseOrderLine" ADD COLUMN IF NOT EXISTS "receivedQty" DECIMAL(12, 4) DEFAULT 0 NOT NULL;

-- 3. Tablas de Albaranes de Compra (Entrada de Mercancía)
CREATE TABLE IF NOT EXISTS "{{schema}}"."PurchaseDeliveryNote" (
  "id" TEXT PRIMARY KEY,
  "seriesId" TEXT NOT NULL REFERENCES "{{schema}}"."DocumentSeries"("id"),
  "docNum" INTEGER NOT NULL,
  "periodId" TEXT NOT NULL REFERENCES "{{schema}}"."AccountingPeriod"("id"),
  "partnerId" TEXT NOT NULL REFERENCES "{{schema}}"."BusinessPartner"("id"),
  "orderId" TEXT REFERENCES "{{schema}}"."PurchaseOrder"("id"),
  "date" TIMESTAMP NOT NULL,
  "status" TEXT DEFAULT 'O' NOT NULL,
  "billToAddress" TEXT,
  "shipToAddress" TEXT,
  "warehouseId" TEXT REFERENCES "{{schema}}"."Warehouse"("id"),
  "total" DECIMAL(15, 4) DEFAULT 0 NOT NULL,
  "createdAt" TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "{{schema}}"."PurchaseDeliveryNoteLine" (
  "id" TEXT PRIMARY KEY,
  "deliveryId" TEXT NOT NULL REFERENCES "{{schema}}"."PurchaseDeliveryNote"("id") ON DELETE CASCADE,
  "lineNum" INTEGER NOT NULL,
  "itemId" TEXT NOT NULL REFERENCES "{{schema}}"."Item"("id"),
  "warehouseId" TEXT REFERENCES "{{schema}}"."Warehouse"("id"),
  "batchNum" TEXT,
  "quantity" DECIMAL(12, 4) NOT NULL,
  "price" DECIMAL(15, 4) NOT NULL,
  "taxGroupId" TEXT REFERENCES "{{schema}}"."TaxGroup"("id"),
  "lineTotal" DECIMAL(15, 4) NOT NULL,
  "baseLine" INTEGER
);

-- 4. Tablas de Facturas de Compra
CREATE TABLE IF NOT EXISTS "{{schema}}"."PurchaseInvoice" (
  "id" TEXT PRIMARY KEY,
  "seriesId" TEXT NOT NULL REFERENCES "{{schema}}"."DocumentSeries"("id"),
  "docNum" INTEGER NOT NULL,
  "periodId" TEXT NOT NULL REFERENCES "{{schema}}"."AccountingPeriod"("id"),
  "partnerId" TEXT NOT NULL REFERENCES "{{schema}}"."BusinessPartner"("id"),
  "date" TIMESTAMP NOT NULL,
  "status" TEXT DEFAULT 'O' NOT NULL,
  "billToAddress" TEXT,
  "shipToAddress" TEXT,
  "total" DECIMAL(15, 4) DEFAULT 0 NOT NULL,
  "createdAt" TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "{{schema}}"."PurchaseInvoiceLine" (
  "id" TEXT PRIMARY KEY,
  "invoiceId" TEXT NOT NULL REFERENCES "{{schema}}"."PurchaseInvoice"("id") ON DELETE CASCADE,
  "lineNum" INTEGER NOT NULL,
  "itemId" TEXT NOT NULL REFERENCES "{{schema}}"."Item"("id"),
  "quantity" DECIMAL(12, 4) NOT NULL,
  "price" DECIMAL(15, 4) NOT NULL,
  "taxGroupId" TEXT REFERENCES "{{schema}}"."TaxGroup"("id"),
  "lineTotal" DECIMAL(15, 4) NOT NULL,
  "baseType" TEXT,
  "baseId" TEXT,
  "baseLine" INTEGER
);
