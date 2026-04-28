-- Añade `createdBy` (TEXT) a todas las cabeceras de documento que no lo
-- tenían. Útil para:
--   1. Saber quién creó el documento (auditoría fina).
--   2. Resolver la firma personal del creador al generar el PDF
--      (prevalece sobre la de empresa si el usuario la configuró).
--
-- No hay FK hacia public."GlobalUser" porque vivimos en un schema de tenant
-- y las FK entre schemas son complicadas en tenant-isolation. Se usa como
-- referencia informal.

ALTER TABLE IF EXISTS "{{schema}}"."SalesOrder"
  ADD COLUMN IF NOT EXISTS "createdBy" TEXT;

ALTER TABLE IF EXISTS "{{schema}}"."PurchaseOrder"
  ADD COLUMN IF NOT EXISTS "createdBy" TEXT;

ALTER TABLE IF EXISTS "{{schema}}"."SalesDeliveryNote"
  ADD COLUMN IF NOT EXISTS "createdBy" TEXT;

ALTER TABLE IF EXISTS "{{schema}}"."PurchaseDeliveryNote"
  ADD COLUMN IF NOT EXISTS "createdBy" TEXT;

ALTER TABLE IF EXISTS "{{schema}}"."SalesInvoice"
  ADD COLUMN IF NOT EXISTS "createdBy" TEXT;

ALTER TABLE IF EXISTS "{{schema}}"."PurchaseInvoice"
  ADD COLUMN IF NOT EXISTS "createdBy" TEXT;
