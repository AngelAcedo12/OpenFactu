-- Amplía los documentos de movimientos internos con ubicación (zona)
-- y lote (batch). Un traspaso ahora puede mover artículos de una zona
-- concreta del almacén origen a una zona concreta del destino, manteniendo
-- la trazabilidad por lote.

ALTER TABLE "{{schema}}"."TransferNoteLine" ADD COLUMN IF NOT EXISTS "fromZoneId" TEXT;
ALTER TABLE "{{schema}}"."TransferNoteLine" ADD COLUMN IF NOT EXISTS "toZoneId" TEXT;
ALTER TABLE "{{schema}}"."TransferNoteLine" ADD COLUMN IF NOT EXISTS "batchNum" TEXT;
ALTER TABLE "{{schema}}"."TransferNoteLine" ADD COLUMN IF NOT EXISTS "uomId" TEXT;

ALTER TABLE "{{schema}}"."GoodsReceiptLine" ADD COLUMN IF NOT EXISTS "zoneId" TEXT;
ALTER TABLE "{{schema}}"."GoodsReceiptLine" ADD COLUMN IF NOT EXISTS "batchNum" TEXT;
ALTER TABLE "{{schema}}"."GoodsReceiptLine" ADD COLUMN IF NOT EXISTS "uomId" TEXT;

ALTER TABLE "{{schema}}"."GoodsIssueLine" ADD COLUMN IF NOT EXISTS "zoneId" TEXT;
ALTER TABLE "{{schema}}"."GoodsIssueLine" ADD COLUMN IF NOT EXISTS "batchNum" TEXT;
ALTER TABLE "{{schema}}"."GoodsIssueLine" ADD COLUMN IF NOT EXISTS "uomId" TEXT;
