-- Migración 010: Reparación y Cumplimiento Logístico (Industrial Force)
-- Garantiza que las tablas críticas existan en el esquema del tenant

CREATE TABLE IF NOT EXISTS "{{schema}}"."WarehouseZone" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "warehouseId" TEXT
);

-- Asegurar que la columna warehouseId existe (por si migración 009 falló parcialmente)
ALTER TABLE "{{schema}}"."WarehouseZone" ADD COLUMN IF NOT EXISTS "warehouseId" TEXT;

-- Vincular FK si no existe
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_zone_warehouse_rep') THEN
        ALTER TABLE "{{schema}}"."WarehouseZone" 
        ADD CONSTRAINT "fk_zone_warehouse_rep" 
        FOREIGN KEY ("warehouseId") REFERENCES "{{schema}}"."Warehouse"(id);
    END IF;
END $$;
