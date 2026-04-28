-- Asientos contables (journal entries).
--
-- Modelo clásico doble partida: cada asiento tiene N líneas y la suma de
-- debe debe igualar la suma de haber. Los asientos pueden nacer manuales
-- (source=manual) o generarse automáticamente desde facturas, pagos y
-- nóminas (source=sales_invoice, purchase_invoice, payment, payroll...).
--
-- Estados:
--   draft    — editable, no cuenta en balances.
--   posted   — inmutable. Si hay que corregir, se crea un contra-asiento
--              con source=reversal y el original pasa a reversed.
--   reversed — marca el original cuando se creó contra-asiento.

CREATE TABLE IF NOT EXISTS "{{schema}}"."JournalEntry" (
  "id"               TEXT PRIMARY KEY,
  "number"           INTEGER NOT NULL,
  "date"             TIMESTAMP NOT NULL,
  "periodId"         TEXT NOT NULL REFERENCES "{{schema}}"."AccountingPeriod"("id"),
  "description"      TEXT,
  "source"           TEXT NOT NULL DEFAULT 'manual',
  "sourceDocumentId" TEXT,
  "status"           TEXT NOT NULL DEFAULT 'draft',
  "reversedById"     TEXT REFERENCES "{{schema}}"."JournalEntry"("id") ON DELETE SET NULL,
  "createdBy"        TEXT,
  "createdAt"        TIMESTAMP NOT NULL DEFAULT now(),
  "postedAt"         TIMESTAMP,
  "postedBy"         TEXT,
  "updatedAt"        TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "JournalEntry_period_idx"
  ON "{{schema}}"."JournalEntry" ("periodId", "number");
CREATE INDEX IF NOT EXISTS "JournalEntry_source_idx"
  ON "{{schema}}"."JournalEntry" ("source", "sourceDocumentId");
CREATE INDEX IF NOT EXISTS "JournalEntry_date_idx"
  ON "{{schema}}"."JournalEntry" ("date");

CREATE TABLE IF NOT EXISTS "{{schema}}"."JournalEntryLine" (
  "id"               TEXT PRIMARY KEY,
  "entryId"          TEXT NOT NULL REFERENCES "{{schema}}"."JournalEntry"("id") ON DELETE CASCADE,
  "lineNumber"       INTEGER NOT NULL,
  "accountId"        TEXT NOT NULL REFERENCES "{{schema}}"."ChartOfAccount"("id"),
  "debit"            DECIMAL(15,4) NOT NULL DEFAULT 0,
  "credit"           DECIMAL(15,4) NOT NULL DEFAULT 0,
  "description"      TEXT,
  "costCenterId"     TEXT REFERENCES "{{schema}}"."CostCenter"("id") ON DELETE SET NULL,
  "profitCenterId"   TEXT REFERENCES "{{schema}}"."ProfitCenter"("id") ON DELETE SET NULL,
  "internalOrderId"  TEXT REFERENCES "{{schema}}"."InternalOrder"("id") ON DELETE SET NULL,
  "partnerId"        TEXT,
  "taxId"            TEXT,
  "currency"         TEXT NOT NULL DEFAULT 'EUR',
  "exchangeRate"     DECIMAL(15,6) NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS "JournalEntryLine_entry_idx"
  ON "{{schema}}"."JournalEntryLine" ("entryId", "lineNumber");
CREATE INDEX IF NOT EXISTS "JournalEntryLine_account_idx"
  ON "{{schema}}"."JournalEntryLine" ("accountId");
CREATE INDEX IF NOT EXISTS "JournalEntryLine_partner_idx"
  ON "{{schema}}"."JournalEntryLine" ("partnerId");

-- Mapeo de cuentas para generación automática. Una fila por combinación
-- (kind, key). Ejemplos:
--   kind=sales_revenue      key=default         → cuenta 700000
--   kind=sales_vat_output   key=tax:<taxGroupId>→ cuenta 477000
--   kind=customer_receivable key=partner:<id>   → cuenta 430xxxxx
-- Se consulta por kind y key — si no hay match específico cae a 'default'.
CREATE TABLE IF NOT EXISTS "{{schema}}"."AccountMapping" (
  "id"         TEXT PRIMARY KEY,
  "kind"       TEXT NOT NULL,
  "key"        TEXT NOT NULL DEFAULT 'default',
  "accountId"  TEXT NOT NULL REFERENCES "{{schema}}"."ChartOfAccount"("id") ON DELETE CASCADE,
  "createdAt"  TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE ("kind", "key")
);
