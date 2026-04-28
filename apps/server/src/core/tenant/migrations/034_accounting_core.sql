-- Base contable avanzada: plan contable + dimensiones analíticas múltiples.
--
-- Esta migración añade los cimientos para asientos contables (fase 2),
-- cierre de período (fase 3) y nómina contabilizada (fase 5). Solo crea
-- metadatos — no genera movimientos ni altera documentos existentes.
--
-- Dimensiones analíticas múltiples (centro de coste + centro de beneficio +
-- orden interna/proyecto). Cada dimensión es independiente y opcional por
-- línea de documento y por línea de asiento.
--
-- El placeholder `projectId` (text) ya presente en las líneas de documento
-- se conserva por compatibilidad y queda deprecado — los 3 nuevos FKs
-- (costCenterId, profitCenterId, internalOrderId) son los campos reales.

-- ─────────────────────────────────────────────────────────────────────────────
-- Plan contable
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "{{schema}}"."ChartOfAccount" (
  "id"            TEXT PRIMARY KEY,
  "code"          TEXT NOT NULL UNIQUE,
  "name"          TEXT NOT NULL,
  "type"          TEXT NOT NULL,        -- asset | liability | equity | income | expense
  "parentId"      TEXT REFERENCES "{{schema}}"."ChartOfAccount"("id") ON DELETE SET NULL,
  "isAnalytical"  BOOLEAN NOT NULL DEFAULT FALSE,
  "isActive"      BOOLEAN NOT NULL DEFAULT TRUE,
  "notes"         TEXT,
  "createdAt"     TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "ChartOfAccount_parent_idx"
  ON "{{schema}}"."ChartOfAccount" ("parentId");
CREATE INDEX IF NOT EXISTS "ChartOfAccount_type_idx"
  ON "{{schema}}"."ChartOfAccount" ("type");

-- ─────────────────────────────────────────────────────────────────────────────
-- Dimensiones analíticas
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "{{schema}}"."CostCenter" (
  "id"                 TEXT PRIMARY KEY,
  "code"               TEXT NOT NULL UNIQUE,
  "name"               TEXT NOT NULL,
  "parentId"           TEXT REFERENCES "{{schema}}"."CostCenter"("id") ON DELETE SET NULL,
  "managerEmployeeId"  TEXT,                         -- FK fase 5 (empleados)
  "isActive"           BOOLEAN NOT NULL DEFAULT TRUE,
  "notes"              TEXT,
  "createdAt"          TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt"          TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "CostCenter_parent_idx"
  ON "{{schema}}"."CostCenter" ("parentId");

CREATE TABLE IF NOT EXISTS "{{schema}}"."ProfitCenter" (
  "id"                 TEXT PRIMARY KEY,
  "code"               TEXT NOT NULL UNIQUE,
  "name"               TEXT NOT NULL,
  "parentId"           TEXT REFERENCES "{{schema}}"."ProfitCenter"("id") ON DELETE SET NULL,
  "managerEmployeeId"  TEXT,
  "isActive"           BOOLEAN NOT NULL DEFAULT TRUE,
  "notes"              TEXT,
  "createdAt"          TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt"          TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "ProfitCenter_parent_idx"
  ON "{{schema}}"."ProfitCenter" ("parentId");

CREATE TABLE IF NOT EXISTS "{{schema}}"."InternalOrder" (
  "id"            TEXT PRIMARY KEY,
  "code"          TEXT NOT NULL UNIQUE,
  "name"          TEXT NOT NULL,
  "type"          TEXT NOT NULL DEFAULT 'project',   -- project | internal_order | wbs
  "startDate"     DATE,
  "endDate"       DATE,
  "budgetAmount"  DECIMAL(15,2),
  "status"        TEXT NOT NULL DEFAULT 'open',      -- open | closed
  "costCenterId"  TEXT REFERENCES "{{schema}}"."CostCenter"("id") ON DELETE SET NULL,
  "notes"         TEXT,
  "createdAt"     TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "InternalOrder_status_idx"
  ON "{{schema}}"."InternalOrder" ("status");

-- Reglas por cuenta: fuerzan o prohíben cada dimensión. Si no hay fila,
-- la dimensión es opcional.
CREATE TABLE IF NOT EXISTS "{{schema}}"."DimensionRule" (
  "id"                      TEXT PRIMARY KEY,
  "accountId"               TEXT NOT NULL REFERENCES "{{schema}}"."ChartOfAccount"("id") ON DELETE CASCADE,
  "requiresCostCenter"      BOOLEAN NOT NULL DEFAULT FALSE,
  "requiresProfitCenter"    BOOLEAN NOT NULL DEFAULT FALSE,
  "requiresInternalOrder"   BOOLEAN NOT NULL DEFAULT FALSE,
  "forbidsCostCenter"       BOOLEAN NOT NULL DEFAULT FALSE,
  "forbidsProfitCenter"     BOOLEAN NOT NULL DEFAULT FALSE,
  "forbidsInternalOrder"    BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE ("accountId")
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Añadir dimensiones a líneas de documento existentes
-- ─────────────────────────────────────────────────────────────────────────────
-- Las 8 tablas de líneas son: SalesOrderLine, SalesDeliveryNoteLine,
-- SalesInvoiceLine, SalesInvoiceReturnLine (si existe), PurchaseOrderLine,
-- PurchaseDeliveryNoteLine, PurchaseInvoiceLine, PurchaseInvoiceReturnLine.
-- Usamos ALTER TABLE IF EXISTS + ADD COLUMN IF NOT EXISTS para no fallar
-- si el tenant no tiene todas las tablas creadas todavía.

ALTER TABLE IF EXISTS "{{schema}}"."SalesOrderLine"
  ADD COLUMN IF NOT EXISTS "costCenterId"    TEXT REFERENCES "{{schema}}"."CostCenter"("id")    ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "profitCenterId"  TEXT REFERENCES "{{schema}}"."ProfitCenter"("id")  ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "internalOrderId" TEXT REFERENCES "{{schema}}"."InternalOrder"("id") ON DELETE SET NULL;

ALTER TABLE IF EXISTS "{{schema}}"."SalesDeliveryNoteLine"
  ADD COLUMN IF NOT EXISTS "costCenterId"    TEXT REFERENCES "{{schema}}"."CostCenter"("id")    ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "profitCenterId"  TEXT REFERENCES "{{schema}}"."ProfitCenter"("id")  ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "internalOrderId" TEXT REFERENCES "{{schema}}"."InternalOrder"("id") ON DELETE SET NULL;

ALTER TABLE IF EXISTS "{{schema}}"."SalesInvoice"
  ADD COLUMN IF NOT EXISTS "costCenterId"    TEXT REFERENCES "{{schema}}"."CostCenter"("id")    ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "profitCenterId"  TEXT REFERENCES "{{schema}}"."ProfitCenter"("id")  ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "internalOrderId" TEXT REFERENCES "{{schema}}"."InternalOrder"("id") ON DELETE SET NULL;

ALTER TABLE IF EXISTS "{{schema}}"."SalesInvoiceLine"
  ADD COLUMN IF NOT EXISTS "costCenterId"    TEXT REFERENCES "{{schema}}"."CostCenter"("id")    ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "profitCenterId"  TEXT REFERENCES "{{schema}}"."ProfitCenter"("id")  ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "internalOrderId" TEXT REFERENCES "{{schema}}"."InternalOrder"("id") ON DELETE SET NULL;

ALTER TABLE IF EXISTS "{{schema}}"."PurchaseOrderLine"
  ADD COLUMN IF NOT EXISTS "costCenterId"    TEXT REFERENCES "{{schema}}"."CostCenter"("id")    ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "profitCenterId"  TEXT REFERENCES "{{schema}}"."ProfitCenter"("id")  ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "internalOrderId" TEXT REFERENCES "{{schema}}"."InternalOrder"("id") ON DELETE SET NULL;

ALTER TABLE IF EXISTS "{{schema}}"."PurchaseDeliveryNoteLine"
  ADD COLUMN IF NOT EXISTS "costCenterId"    TEXT REFERENCES "{{schema}}"."CostCenter"("id")    ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "profitCenterId"  TEXT REFERENCES "{{schema}}"."ProfitCenter"("id")  ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "internalOrderId" TEXT REFERENCES "{{schema}}"."InternalOrder"("id") ON DELETE SET NULL;

ALTER TABLE IF EXISTS "{{schema}}"."PurchaseInvoice"
  ADD COLUMN IF NOT EXISTS "costCenterId"    TEXT REFERENCES "{{schema}}"."CostCenter"("id")    ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "profitCenterId"  TEXT REFERENCES "{{schema}}"."ProfitCenter"("id")  ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "internalOrderId" TEXT REFERENCES "{{schema}}"."InternalOrder"("id") ON DELETE SET NULL;

ALTER TABLE IF EXISTS "{{schema}}"."PurchaseInvoiceLine"
  ADD COLUMN IF NOT EXISTS "costCenterId"    TEXT REFERENCES "{{schema}}"."CostCenter"("id")    ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "profitCenterId"  TEXT REFERENCES "{{schema}}"."ProfitCenter"("id")  ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "internalOrderId" TEXT REFERENCES "{{schema}}"."InternalOrder"("id") ON DELETE SET NULL;
