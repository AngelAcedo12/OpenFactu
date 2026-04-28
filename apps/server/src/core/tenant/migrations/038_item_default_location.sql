-- Artículo: almacén y ubicación por defecto.
-- Sirven para auto-rellenar `warehouseId` / `zoneId` en las líneas de
-- documento cuando el usuario elige el artículo, simplificando el picking.
ALTER TABLE "{{schema}}"."Item"
  ADD COLUMN IF NOT EXISTS "defaultWarehouseId" TEXT REFERENCES "{{schema}}"."Warehouse"("id") ON DELETE SET NULL;

ALTER TABLE "{{schema}}"."Item"
  ADD COLUMN IF NOT EXISTS "defaultZoneId" TEXT REFERENCES "{{schema}}"."WarehouseZone"("id") ON DELETE SET NULL;
