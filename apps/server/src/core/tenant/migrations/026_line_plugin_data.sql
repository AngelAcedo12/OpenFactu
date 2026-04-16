-- 026: Añade columna pluginData (jsonb) a las 6 tablas de líneas de documento.
-- Permite almacenar campos custom de plugins a nivel de línea sin migraciones adicionales.

ALTER TABLE "SalesOrderLine"           ADD COLUMN IF NOT EXISTS "pluginData" jsonb DEFAULT '{}';
ALTER TABLE "SalesDeliveryNoteLine"    ADD COLUMN IF NOT EXISTS "pluginData" jsonb DEFAULT '{}';
ALTER TABLE "SalesInvoiceLine"         ADD COLUMN IF NOT EXISTS "pluginData" jsonb DEFAULT '{}';
ALTER TABLE "PurchaseOrderLine"        ADD COLUMN IF NOT EXISTS "pluginData" jsonb DEFAULT '{}';
ALTER TABLE "PurchaseDeliveryNoteLine" ADD COLUMN IF NOT EXISTS "pluginData" jsonb DEFAULT '{}';
ALTER TABLE "PurchaseInvoiceLine"      ADD COLUMN IF NOT EXISTS "pluginData" jsonb DEFAULT '{}';
