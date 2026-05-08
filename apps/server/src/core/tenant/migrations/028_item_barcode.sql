-- Añade campo `barcode` al artículo. Es independiente del `code` interno: el
-- barcode contiene el valor real (EAN-13/UPC/Code128) que se imprime en
-- etiquetas y se escanea en venta. Nullable y único parcial: dos artículos
-- distintos no deberían compartir barcode, pero permitimos NULL para los que
-- todavía no se hayan registrado.
ALTER TABLE "{{schema}}"."Item" ADD COLUMN IF NOT EXISTS "barcode" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Item_barcode_unique"
  ON "{{schema}}"."Item" ("barcode")
  WHERE "barcode" IS NOT NULL;
