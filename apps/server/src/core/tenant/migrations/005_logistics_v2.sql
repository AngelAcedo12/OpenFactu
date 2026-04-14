-- Migración 005: Jerarquía Logística y Unidades Alternativas
-- Introduce Zonas de Almacén y soporte para unidades por artículo

CREATE TABLE IF NOT EXISTS "{{schema}}"."WarehouseZone" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT
);

ALTER TABLE "{{schema}}"."Warehouse" ADD COLUMN IF NOT EXISTS "zoneId" TEXT;

-- Añadir FK para zoneId de forma segura
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_warehouse_zone') THEN
        ALTER TABLE "{{schema}}"."Warehouse" 
        ADD CONSTRAINT "fk_warehouse_zone" 
        FOREIGN KEY ("zoneId") REFERENCES "{{schema}}"."WarehouseZone"(id);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "{{schema}}"."ItemAlternativeUom" (
    "id" TEXT PRIMARY KEY,
    "itemId" TEXT NOT NULL REFERENCES "{{schema}}"."Item"(id),
    "uomId" TEXT NOT NULL REFERENCES "{{schema}}"."UnitOfMeasure"(id),
    "factor" DECIMAL(12,4) NOT NULL
);
