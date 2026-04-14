-- Migración 007: Jerarquía Almacén-Zona (Empresarial v2)
-- Mueve la relación de zonas hacia el almacén y limpia el esquema antiguo

ALTER TABLE "{{schema}}"."WarehouseZone" ADD COLUMN IF NOT EXISTS "warehouseId" TEXT;

-- Vincular zonas huérfanas al almacén predeterminado si existe
DO $$
DECLARE
    def_wh_id TEXT;
BEGIN
    SELECT id INTO def_wh_id FROM "{{schema}}"."Warehouse" WHERE "isDefault" = true LIMIT 1;
    IF def_wh_id IS NOT NULL THEN
        UPDATE "{{schema}}"."WarehouseZone" SET "warehouseId" = def_wh_id WHERE "warehouseId" IS NULL;
    END IF;
END $$;

-- Añadir FK
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_zone_warehouse') THEN
        ALTER TABLE "{{schema}}"."WarehouseZone" 
        ADD CONSTRAINT "fk_zone_warehouse" 
        FOREIGN KEY ("warehouseId") REFERENCES "{{schema}}"."Warehouse"(id);
    END IF;
END $$;

-- Eliminar columna antigua en Warehouse (ya no es necesaria)
ALTER TABLE "{{schema}}"."Warehouse" DROP COLUMN IF EXISTS "zoneId";
