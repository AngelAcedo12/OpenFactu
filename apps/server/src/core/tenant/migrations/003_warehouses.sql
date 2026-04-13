-- 7. Almacenes y Stock
CREATE TABLE IF NOT EXISTS "{{schema}}"."Warehouse" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "location" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "{{schema}}"."ItemWarehouseStock" (
  "itemId" TEXT NOT NULL REFERENCES "{{schema}}"."Item"("id") ON DELETE CASCADE,
  "warehouseId" TEXT NOT NULL REFERENCES "{{schema}}"."Warehouse"("id") ON DELETE CASCADE,
  "stock" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("itemId", "warehouseId")
);

-- Insertar un almacén por defecto inicial para asegurar que el sistema funcione
INSERT INTO "{{schema}}"."Warehouse" ("id", "name", "location", "isDefault")
VALUES (gen_random_uuid()::text, 'Almacén Principal', 'Sede Central', TRUE);
