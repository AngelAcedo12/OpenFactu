-- Plan 1 — Pluses en nóminas + Proyecto en cabecera de documentos.
--
-- 1. Catálogo de conceptos de nómina configurable por empresa
--    (PayrollConcept) y ampliación de PayrollLine para soportar
--    conceptId, quantity, rate y baseAmount (cálculos por horas o %).
-- 2. Columna `internalOrderId` en cabecera de los documentos comerciales
--    (SalesOrder, SalesDeliveryNote, PurchaseOrder, PurchaseDeliveryNote).
--    SalesInvoice y PurchaseInvoice ya tenían la columna desde
--    migraciones previas (mig 032).

-- ── Catálogo de conceptos de nómina ─────────────────────────────────
CREATE TABLE IF NOT EXISTS "{{schema}}"."PayrollConcept" (
  "id"              TEXT PRIMARY KEY,
  "code"            TEXT NOT NULL UNIQUE,
  "name"            TEXT NOT NULL,
  "kind"            TEXT NOT NULL,                    -- devengo | deduccion | aportacion_empresa
  "taxableIrpf"     BOOLEAN NOT NULL DEFAULT TRUE,
  "taxableSs"       BOOLEAN NOT NULL DEFAULT TRUE,
  "calculation"     TEXT NOT NULL DEFAULT 'fixed',    -- fixed | percent_of_base | per_hour
  "defaultAmount"   DECIMAL(15,2),
  "defaultPercent"  DECIMAL(6,3),
  "accountId"       TEXT REFERENCES "{{schema}}"."ChartOfAccount"("id") ON DELETE SET NULL,
  "isActive"        BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"       TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt"       TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "PayrollConcept_kind_idx" ON "{{schema}}"."PayrollConcept"("kind");

-- ── Ampliación de PayrollLine ───────────────────────────────────────
ALTER TABLE "{{schema}}"."PayrollLine"
  ADD COLUMN IF NOT EXISTS "conceptId"   TEXT REFERENCES "{{schema}}"."PayrollConcept"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "quantity"    DECIMAL(12,4),
  ADD COLUMN IF NOT EXISTS "rate"        DECIMAL(15,4),
  ADD COLUMN IF NOT EXISTS "baseAmount"  DECIMAL(15,2);

-- ── Proyecto en cabecera de documentos comerciales ──────────────────
ALTER TABLE "{{schema}}"."SalesOrder"
  ADD COLUMN IF NOT EXISTS "internalOrderId" TEXT REFERENCES "{{schema}}"."InternalOrder"("id") ON DELETE SET NULL;

ALTER TABLE "{{schema}}"."SalesDeliveryNote"
  ADD COLUMN IF NOT EXISTS "internalOrderId" TEXT REFERENCES "{{schema}}"."InternalOrder"("id") ON DELETE SET NULL;

ALTER TABLE "{{schema}}"."PurchaseOrder"
  ADD COLUMN IF NOT EXISTS "internalOrderId" TEXT REFERENCES "{{schema}}"."InternalOrder"("id") ON DELETE SET NULL;

ALTER TABLE "{{schema}}"."PurchaseDeliveryNote"
  ADD COLUMN IF NOT EXISTS "internalOrderId" TEXT REFERENCES "{{schema}}"."InternalOrder"("id") ON DELETE SET NULL;
