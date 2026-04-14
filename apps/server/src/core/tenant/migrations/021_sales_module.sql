-- 021_sales_module.sql

-- Limpiar tablas de ventas anteriores (placeholders)
DROP TABLE IF EXISTS "{{schema}}"."DocumentLineDist" CASCADE;
DROP TABLE IF EXISTS "{{schema}}"."InvoiceLine" CASCADE;
DROP TABLE IF EXISTS "{{schema}}"."InvoiceHeader" CASCADE;
DROP TABLE IF EXISTS "{{schema}}"."DeliveryLine" CASCADE;
DROP TABLE IF EXISTS "{{schema}}"."DeliveryHeader" CASCADE;
DROP TABLE IF EXISTS "{{schema}}"."OrderLine" CASCADE;
DROP TABLE IF EXISTS "{{schema}}"."OrderHeader" CASCADE;

-- 1. Tablas de Pedidos de Venta
CREATE TABLE "{{schema}}"."SalesOrder" (
  "id" TEXT PRIMARY KEY,
  "seriesId" TEXT NOT NULL REFERENCES "{{schema}}"."DocumentSeries"("id"),
  "docNum" INTEGER NOT NULL,
  "periodId" TEXT NOT NULL REFERENCES "{{schema}}"."AccountingPeriod"("id"),
  "partnerId" TEXT NOT NULL REFERENCES "{{schema}}"."BusinessPartner"("id"),
  "date" TIMESTAMP NOT NULL,
  "deliveryDate" TIMESTAMP,
  "documentDate" TIMESTAMP,
  "status" TEXT DEFAULT 'O' NOT NULL,
  "billToAddress" TEXT,
  "shipToAddress" TEXT,
  "warehouseId" TEXT REFERENCES "{{schema}}"."Warehouse"("id"),
  "subtotal" DECIMAL(15, 4) DEFAULT 0 NOT NULL,
  "taxTotal" DECIMAL(15, 4) DEFAULT 0 NOT NULL,
  "total" DECIMAL(15, 4) DEFAULT 0 NOT NULL,
  "taxBreakdown" TEXT,
  "createdAt" TIMESTAMP DEFAULT now()
);

CREATE TABLE "{{schema}}"."SalesOrderLine" (
  "id" TEXT PRIMARY KEY,
  "orderId" TEXT NOT NULL REFERENCES "{{schema}}"."SalesOrder"("id") ON DELETE CASCADE,
  "lineNum" INTEGER NOT NULL,
  "itemId" TEXT NOT NULL REFERENCES "{{schema}}"."Item"("id"),
  "warehouseId" TEXT REFERENCES "{{schema}}"."Warehouse"("id"),
  "zoneId" TEXT REFERENCES "{{schema}}"."WarehouseZone"("id"),
  "quantity" DECIMAL(12, 4) NOT NULL,
  "deliveredQty" DECIMAL(12, 4) DEFAULT 0 NOT NULL,
  "price" DECIMAL(15, 4) NOT NULL,
  "taxGroupId" TEXT REFERENCES "{{schema}}"."TaxGroup"("id"),
  "lineTotal" DECIMAL(15, 4) NOT NULL
);

-- 2. Tablas de Albaranes de Venta (Salida de Mercancía)
CREATE TABLE "{{schema}}"."SalesDeliveryNote" (
  "id" TEXT PRIMARY KEY,
  "seriesId" TEXT NOT NULL REFERENCES "{{schema}}"."DocumentSeries"("id"),
  "docNum" INTEGER NOT NULL,
  "periodId" TEXT NOT NULL REFERENCES "{{schema}}"."AccountingPeriod"("id"),
  "partnerId" TEXT NOT NULL REFERENCES "{{schema}}"."BusinessPartner"("id"),
  "orderId" TEXT REFERENCES "{{schema}}"."SalesOrder"("id"),
  "date" TIMESTAMP NOT NULL,
  "status" TEXT DEFAULT 'O' NOT NULL,
  "billToAddress" TEXT,
  "shipToAddress" TEXT,
  "warehouseId" TEXT REFERENCES "{{schema}}"."Warehouse"("id"),
  "subtotal" DECIMAL(15, 4) DEFAULT 0 NOT NULL,
  "taxTotal" DECIMAL(15, 4) DEFAULT 0 NOT NULL,
  "total" DECIMAL(15, 4) DEFAULT 0 NOT NULL,
  "taxBreakdown" TEXT,
  "createdAt" TIMESTAMP DEFAULT now()
);

CREATE TABLE "{{schema}}"."SalesDeliveryNoteLine" (
  "id" TEXT PRIMARY KEY,
  "deliveryId" TEXT NOT NULL REFERENCES "{{schema}}"."SalesDeliveryNote"("id") ON DELETE CASCADE,
  "lineNum" INTEGER NOT NULL,
  "itemId" TEXT NOT NULL REFERENCES "{{schema}}"."Item"("id"),
  "warehouseId" TEXT REFERENCES "{{schema}}"."Warehouse"("id"),
  "zoneId" TEXT REFERENCES "{{schema}}"."WarehouseZone"("id"),
  "quantity" DECIMAL(12, 4) NOT NULL,
  "price" DECIMAL(15, 4) NOT NULL,
  "taxGroupId" TEXT REFERENCES "{{schema}}"."TaxGroup"("id"),
  "lineTotal" DECIMAL(15, 4) NOT NULL,
  "baseLine" INTEGER
);

-- Trazabilidad en Albaranes (Lotes/Series asignados a la salida)
CREATE TABLE "{{schema}}"."SalesDeliveryNoteLineBatch" (
  "id" TEXT PRIMARY KEY,
  "deliveryLineId" TEXT NOT NULL REFERENCES "{{schema}}"."SalesDeliveryNoteLine"("id") ON DELETE CASCADE,
  "batchNum" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION DEFAULT 1 NOT NULL,
  "createdAt" TIMESTAMP DEFAULT now()
);

-- 3. Tablas de Facturas de Venta
CREATE TABLE "{{schema}}"."SalesInvoice" (
  "id" TEXT PRIMARY KEY,
  "seriesId" TEXT NOT NULL REFERENCES "{{schema}}"."DocumentSeries"("id"),
  "docNum" INTEGER NOT NULL,
  "periodId" TEXT NOT NULL REFERENCES "{{schema}}"."AccountingPeriod"("id"),
  "partnerId" TEXT NOT NULL REFERENCES "{{schema}}"."BusinessPartner"("id"),
  "date" TIMESTAMP NOT NULL,
  "status" TEXT DEFAULT 'O' NOT NULL,
  "billToAddress" TEXT,
  "shipToAddress" TEXT,
  "subtotal" DECIMAL(15, 4) DEFAULT 0 NOT NULL,
  "taxTotal" DECIMAL(15, 4) DEFAULT 0 NOT NULL,
  "total" DECIMAL(15, 4) DEFAULT 0 NOT NULL,
  "taxBreakdown" TEXT,
  "createdAt" TIMESTAMP DEFAULT now()
);

CREATE TABLE "{{schema}}"."SalesInvoiceLine" (
  "id" TEXT PRIMARY KEY,
  "invoiceId" TEXT NOT NULL REFERENCES "{{schema}}"."SalesInvoice"("id") ON DELETE CASCADE,
  "lineNum" INTEGER NOT NULL,
  "itemId" TEXT NOT NULL REFERENCES "{{schema}}"."Item"("id"),
  "warehouseId" TEXT REFERENCES "{{schema}}"."Warehouse"("id"),
  "zoneId" TEXT REFERENCES "{{schema}}"."WarehouseZone"("id"),
  "quantity" DECIMAL(12, 4) NOT NULL,
  "price" DECIMAL(15, 4) NOT NULL,
  "taxGroupId" TEXT REFERENCES "{{schema}}"."TaxGroup"("id"),
  "lineTotal" DECIMAL(15, 4) NOT NULL,
  "baseType" TEXT,
  "baseId" TEXT,
  "baseLine" INTEGER
);

CREATE TABLE "{{schema}}"."SalesInvoiceLineBatch" (
  "id" TEXT PRIMARY KEY,
  "invoiceLineId" TEXT NOT NULL REFERENCES "{{schema}}"."SalesInvoiceLine"("id") ON DELETE CASCADE,
  "batchNum" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION DEFAULT 1 NOT NULL,
  "createdAt" TIMESTAMP DEFAULT now()
);
