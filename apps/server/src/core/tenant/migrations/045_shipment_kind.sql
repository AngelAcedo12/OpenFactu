-- Tipo de envío: 'delivery' (por defecto) o 'pickup_return' para recogidas
-- de devolución independientes (sin albarán de venta previo). Un
-- pickup_return funciona al revés que un delivery: el origen es la
-- dirección del cliente y el destino es un almacén propio.

ALTER TABLE "{{schema}}"."Shipment"
  ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'delivery';

-- Almacén donde aterriza la mercancía recogida (sólo para pickup_return).
ALTER TABLE "{{schema}}"."Shipment"
  ADD COLUMN IF NOT EXISTS "returnWarehouseId" TEXT;
