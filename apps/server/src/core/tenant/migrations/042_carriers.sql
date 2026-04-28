-- Transportistas dinámicos (el usuario puede dar de alta cualquiera).
--   Carrier          — ficha del transportista (nombre, logo, adapter opcional).
--   CarrierAccount   — credenciales / configuración de una cuenta contratada.
--
-- `adapterId` es el identificador del `ICarrierAdapter` registrado en el
-- CarrierRegistry del backend (p. ej. 'manual', 'seur-b2b', 'dhl-express').
-- Si es NULL, el carrier es "manual" — no hay llamadas externas, el usuario
-- gestiona el envío a mano (tracking number libre, etiqueta manual, etc.).

CREATE TABLE IF NOT EXISTS "{{schema}}"."Carrier" (
  "id"           TEXT PRIMARY KEY,
  "name"         TEXT NOT NULL,
  "code"         TEXT,
  "logoUrl"      TEXT,
  "isActive"     BOOLEAN NOT NULL DEFAULT TRUE,
  "adapterId"    TEXT,
  "notes"        TEXT,
  "createdAt"    TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "{{schema}}"."CarrierAccount" (
  "id"           TEXT PRIMARY KEY,
  "carrierId"    TEXT NOT NULL REFERENCES "{{schema}}"."Carrier"("id") ON DELETE CASCADE,
  "name"         TEXT NOT NULL,
  "sandbox"      BOOLEAN NOT NULL DEFAULT FALSE,
  "isDefault"    BOOLEAN NOT NULL DEFAULT FALSE,
  "credentials"  JSONB NOT NULL DEFAULT '{}'::jsonb,
  "createdAt"    TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "CarrierAccount_carrier_idx"
  ON "{{schema}}"."CarrierAccount" ("carrierId");

-- Enlace opcional desde Shipment hacia la cuenta usada para contratarlo.
ALTER TABLE "{{schema}}"."Shipment"
  ADD COLUMN IF NOT EXISTS "carrierAccountId" TEXT;
