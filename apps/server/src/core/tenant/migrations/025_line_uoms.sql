-- 025: Añade uomId y uomFactor a las 6 tablas de líneas de documento.
-- uomId: la UoM elegida por el usuario al crear la línea (puede ser base o alternativa).
-- uomFactor: factor de conversión congelado en el momento de creación (para no romper históricos).
-- Valores NULL → se interpretan como UoM base del artículo con factor 1.

ALTER TABLE "SalesOrderLine"           ADD COLUMN IF NOT EXISTS "uomId" text REFERENCES "UnitOfMeasure"("id");
ALTER TABLE "SalesOrderLine"           ADD COLUMN IF NOT EXISTS "uomFactor" decimal(12,4) DEFAULT '1.0000';

ALTER TABLE "SalesDeliveryNoteLine"    ADD COLUMN IF NOT EXISTS "uomId" text REFERENCES "UnitOfMeasure"("id");
ALTER TABLE "SalesDeliveryNoteLine"    ADD COLUMN IF NOT EXISTS "uomFactor" decimal(12,4) DEFAULT '1.0000';

ALTER TABLE "SalesInvoiceLine"         ADD COLUMN IF NOT EXISTS "uomId" text REFERENCES "UnitOfMeasure"("id");
ALTER TABLE "SalesInvoiceLine"         ADD COLUMN IF NOT EXISTS "uomFactor" decimal(12,4) DEFAULT '1.0000';

ALTER TABLE "PurchaseOrderLine"        ADD COLUMN IF NOT EXISTS "uomId" text REFERENCES "UnitOfMeasure"("id");
ALTER TABLE "PurchaseOrderLine"        ADD COLUMN IF NOT EXISTS "uomFactor" decimal(12,4) DEFAULT '1.0000';

ALTER TABLE "PurchaseDeliveryNoteLine" ADD COLUMN IF NOT EXISTS "uomId" text REFERENCES "UnitOfMeasure"("id");
ALTER TABLE "PurchaseDeliveryNoteLine" ADD COLUMN IF NOT EXISTS "uomFactor" decimal(12,4) DEFAULT '1.0000';

ALTER TABLE "PurchaseInvoiceLine"      ADD COLUMN IF NOT EXISTS "uomId" text REFERENCES "UnitOfMeasure"("id");
ALTER TABLE "PurchaseInvoiceLine"      ADD COLUMN IF NOT EXISTS "uomFactor" decimal(12,4) DEFAULT '1.0000';
