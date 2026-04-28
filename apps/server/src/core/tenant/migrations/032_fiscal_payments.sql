-- 032_fiscal_payments.sql
-- ──────────────────────────────────────────────────────────────────
-- Añade la infraestructura fiscal + pagos + descuentos/retenciones +
-- lock al asentar que pidió el usuario.
--
-- Tipos de PK alineados con el esquema existente (TEXT), no UUID —
-- el resto de tablas usan text('id') primary key con UUIDs generados
-- en server.
-- ──────────────────────────────────────────────────────────────────

-- ══════════════════════════════════════════════════════════════════
-- 1. TABLAS NUEVAS
-- ══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "Currency" (
  id            TEXT PRIMARY KEY,
  code          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  symbol        TEXT NOT NULL,
  decimals      INTEGER NOT NULL DEFAULT 2,
  "exchangeRate" DECIMAL(12,6) NOT NULL DEFAULT 1,
  "isBase"      BOOLEAN NOT NULL DEFAULT false,
  "isActive"    BOOLEAN NOT NULL DEFAULT true,
  "updatedAt"   TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "DocumentType" (
  id            TEXT PRIMARY KEY,
  code          TEXT NOT NULL,
  name          TEXT NOT NULL,
  description   TEXT,
  "pluginId"    TEXT,
  "docCategory" TEXT NOT NULL,
  "isRectify"   BOOLEAN NOT NULL DEFAULT false,
  "isActive"    BOOLEAN NOT NULL DEFAULT true,
  "sortOrder"   INTEGER DEFAULT 0,
  "createdAt"   TIMESTAMP DEFAULT NOW()
);
-- Unique (code, pluginId) con pluginId NULL permitido — los índices únicos
-- tratan NULL como distinto, así que lo hacemos con un índice condicional.
CREATE UNIQUE INDEX IF NOT EXISTS "DocumentType_code_plugin_uidx"
  ON "DocumentType"(code, COALESCE("pluginId", ''));

CREATE TABLE IF NOT EXISTS "PaymentMethod" (
  id         TEXT PRIMARY KEY,
  code       TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  "pluginId" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS "PaymentTerm" (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  lines      JSONB NOT NULL DEFAULT '[]'::jsonb,
  "isActive" BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS "Contact" (
  id          TEXT PRIMARY KEY,
  "partnerId" TEXT NOT NULL REFERENCES "BusinessPartner"(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  role        TEXT,
  email       TEXT,
  phone       TEXT,
  mobile      TEXT,
  "isMain"    BOOLEAN NOT NULL DEFAULT false,
  notes       TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "Contact_partnerId_idx" ON "Contact"("partnerId");

CREATE TABLE IF NOT EXISTS "Payment" (
  id                  TEXT PRIMARY KEY,
  "salesInvoiceId"    TEXT REFERENCES "SalesInvoice"(id) ON DELETE CASCADE,
  "purchaseInvoiceId" TEXT REFERENCES "PurchaseInvoice"(id) ON DELETE CASCADE,
  date                DATE NOT NULL,
  amount              DECIMAL(15,4) NOT NULL,
  "currencyId"        TEXT REFERENCES "Currency"(id),
  "exchangeRate"      DECIMAL(12,6) DEFAULT 1,
  "amountBase"        DECIMAL(15,4),
  "paymentMethodId"   TEXT REFERENCES "PaymentMethod"(id),
  reference           TEXT,
  notes               TEXT,
  source              TEXT DEFAULT 'manual',
  "sourceRef"         TEXT,
  "createdBy"         TEXT,
  "createdAt"         TIMESTAMP DEFAULT NOW(),
  CONSTRAINT payment_exactly_one_invoice CHECK (
    ("salesInvoiceId" IS NOT NULL AND "purchaseInvoiceId" IS NULL)
    OR ("salesInvoiceId" IS NULL AND "purchaseInvoiceId" IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS "Payment_salesInvoiceId_idx"    ON "Payment"("salesInvoiceId");
CREATE INDEX IF NOT EXISTS "Payment_purchaseInvoiceId_idx" ON "Payment"("purchaseInvoiceId");

-- ══════════════════════════════════════════════════════════════════
-- 2. COLUMNAS NUEVAS EN INVOICES
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE "SalesInvoice"
  ADD COLUMN IF NOT EXISTS "isLocked"          BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "lockedAt"          TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "documentTypeId"    TEXT REFERENCES "DocumentType"(id),
  ADD COLUMN IF NOT EXISTS "dueDate"           DATE,
  ADD COLUMN IF NOT EXISTS "supplyDate"        DATE,
  ADD COLUMN IF NOT EXISTS "paymentMethodId"   TEXT REFERENCES "PaymentMethod"(id),
  ADD COLUMN IF NOT EXISTS "paymentTermId"     TEXT REFERENCES "PaymentTerm"(id),
  ADD COLUMN IF NOT EXISTS "paymentDueLines"   JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "paymentStatus"     TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS "amountPaid"        DECIMAL(15,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "withholdingRate"   DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS "withholdingAmount" DECIMAL(15,4),
  ADD COLUMN IF NOT EXISTS "rectifyRef"        TEXT,
  ADD COLUMN IF NOT EXISTS "rectifyReason"     TEXT,
  ADD COLUMN IF NOT EXISTS "rectifyType"       TEXT,
  ADD COLUMN IF NOT EXISTS "currencyId"        TEXT REFERENCES "Currency"(id),
  ADD COLUMN IF NOT EXISTS "exchangeRate"      DECIMAL(12,6) DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "totalCurrency"     DECIMAL(15,4),
  ADD COLUMN IF NOT EXISTS "billingAddressId"  TEXT,
  ADD COLUMN IF NOT EXISTS "shippingAddressId" TEXT,
  ADD COLUMN IF NOT EXISTS "notes"             TEXT,
  ADD COLUMN IF NOT EXISTS "internalNotes"     TEXT,
  ADD COLUMN IF NOT EXISTS "fiscalHash"        TEXT,
  ADD COLUMN IF NOT EXISTS "fiscalHashPrev"    TEXT,
  ADD COLUMN IF NOT EXISTS "fiscalStatus"      TEXT,
  ADD COLUMN IF NOT EXISTS "fiscalSentAt"      TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "fiscalRef"         TEXT,
  ADD COLUMN IF NOT EXISTS "projectId"         TEXT;

ALTER TABLE "PurchaseInvoice"
  ADD COLUMN IF NOT EXISTS "isLocked"          BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "lockedAt"          TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "documentTypeId"    TEXT REFERENCES "DocumentType"(id),
  ADD COLUMN IF NOT EXISTS "dueDate"           DATE,
  ADD COLUMN IF NOT EXISTS "supplyDate"        DATE,
  ADD COLUMN IF NOT EXISTS "paymentMethodId"   TEXT REFERENCES "PaymentMethod"(id),
  ADD COLUMN IF NOT EXISTS "paymentTermId"     TEXT REFERENCES "PaymentTerm"(id),
  ADD COLUMN IF NOT EXISTS "paymentDueLines"   JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "paymentStatus"     TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS "amountPaid"        DECIMAL(15,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "withholdingRate"   DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS "withholdingAmount" DECIMAL(15,4),
  ADD COLUMN IF NOT EXISTS "rectifyRef"        TEXT,
  ADD COLUMN IF NOT EXISTS "rectifyReason"     TEXT,
  ADD COLUMN IF NOT EXISTS "rectifyType"       TEXT,
  ADD COLUMN IF NOT EXISTS "currencyId"        TEXT REFERENCES "Currency"(id),
  ADD COLUMN IF NOT EXISTS "exchangeRate"      DECIMAL(12,6) DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "totalCurrency"     DECIMAL(15,4),
  ADD COLUMN IF NOT EXISTS "billingAddressId"  TEXT,
  ADD COLUMN IF NOT EXISTS "shippingAddressId" TEXT,
  ADD COLUMN IF NOT EXISTS "notes"             TEXT,
  ADD COLUMN IF NOT EXISTS "internalNotes"     TEXT,
  ADD COLUMN IF NOT EXISTS "fiscalHash"        TEXT,
  ADD COLUMN IF NOT EXISTS "fiscalHashPrev"    TEXT,
  ADD COLUMN IF NOT EXISTS "fiscalStatus"      TEXT,
  ADD COLUMN IF NOT EXISTS "fiscalSentAt"      TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "fiscalRef"         TEXT,
  ADD COLUMN IF NOT EXISTS "projectId"         TEXT;

-- ══════════════════════════════════════════════════════════════════
-- 3. COLUMNAS NUEVAS EN LÍNEAS (6 tipos: facturas, albaranes, pedidos)
-- ══════════════════════════════════════════════════════════════════

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'SalesInvoiceLine',
    'PurchaseInvoiceLine',
    'SalesDeliveryNoteLine',
    'PurchaseDeliveryNoteLine',
    'SalesOrderLine',
    'PurchaseOrderLine'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I
      ADD COLUMN IF NOT EXISTS "description"       TEXT,
      ADD COLUMN IF NOT EXISTS "discountRate"      DECIMAL(5,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "discountAmount"    DECIMAL(15,4) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "taxRate"           DECIMAL(5,2),
      ADD COLUMN IF NOT EXISTS "taxAmount"         DECIMAL(15,4),
      ADD COLUMN IF NOT EXISTS "withholdingRate"   DECIMAL(5,2),
      ADD COLUMN IF NOT EXISTS "withholdingAmount" DECIMAL(15,4),
      ADD COLUMN IF NOT EXISTS "projectId"         TEXT', t);
  END LOOP;
END $$;

-- ══════════════════════════════════════════════════════════════════
-- 4. DATOS INICIALES (seed idempotente)
-- ══════════════════════════════════════════════════════════════════

-- Currencies
INSERT INTO "Currency" (id, code, name, symbol, decimals, "isBase") VALUES
  (gen_random_uuid()::text, 'EUR', 'Euro',            '€',  2, true),
  (gen_random_uuid()::text, 'USD', 'Dólar americano', '$',  2, false),
  (gen_random_uuid()::text, 'GBP', 'Libra esterlina', '£',  2, false),
  (gen_random_uuid()::text, 'MXN', 'Peso mexicano',   '$',  2, false),
  (gen_random_uuid()::text, 'CLP', 'Peso chileno',    '$',  0, false),
  (gen_random_uuid()::text, 'COP', 'Peso colombiano', '$',  0, false),
  (gen_random_uuid()::text, 'PEN', 'Sol peruano',     'S/', 2, false),
  (gen_random_uuid()::text, 'ARS', 'Peso argentino',  '$',  2, false),
  (gen_random_uuid()::text, 'BRL', 'Real brasileño',  'R$', 2, false)
ON CONFLICT (code) DO NOTHING;

-- PaymentMethods
INSERT INTO "PaymentMethod" (id, code, name) VALUES
  (gen_random_uuid()::text, 'TRANSFER',     'Transferencia bancaria'),
  (gen_random_uuid()::text, 'CASH',         'Efectivo'),
  (gen_random_uuid()::text, 'CARD',         'Tarjeta'),
  (gen_random_uuid()::text, 'CHECK',        'Cheque'),
  (gen_random_uuid()::text, 'DIRECT_DEBIT', 'Domiciliación bancaria'),
  (gen_random_uuid()::text, 'OFFSET',       'Compensación'),
  (gen_random_uuid()::text, 'OTHER',        'Otros')
ON CONFLICT (code) DO NOTHING;

-- PaymentTerms — no hay constraint único por nombre, usamos un WHERE NOT EXISTS
INSERT INTO "PaymentTerm" (id, name, lines)
SELECT gen_random_uuid()::text, v.name, v.lines::jsonb
FROM (VALUES
  ('Contado',   '[{"days":0,"percentage":100}]'),
  ('15 días',   '[{"days":15,"percentage":100}]'),
  ('30 días',   '[{"days":30,"percentage":100}]'),
  ('60 días',   '[{"days":60,"percentage":100}]'),
  ('90 días',   '[{"days":90,"percentage":100}]'),
  ('30/60',     '[{"days":30,"percentage":50},{"days":60,"percentage":50}]'),
  ('30/60/90',  '[{"days":30,"percentage":34},{"days":60,"percentage":33},{"days":90,"percentage":33}]')
) AS v(name, lines)
WHERE NOT EXISTS (SELECT 1 FROM "PaymentTerm" pt WHERE pt.name = v.name);

-- SystemConfig — sólo claves nuevas, las existentes no se tocan.
-- La tabla tiene `id` TEXT NOT NULL. Generamos UUID via gen_random_uuid().
INSERT INTO "SystemConfig" (id, key, value)
SELECT gen_random_uuid()::text, v.key, v.value
FROM (VALUES
  ('company_fiscal_regime',   ''),
  ('company_invoice_footer',  ''),
  ('company_invoice_color',   '#0D9488'),
  ('company_iban',            ''),
  ('company_bank_name',       ''),
  ('company_bank_swift',      ''),
  ('fiscal_certificate_path', ''),
  ('fiscal_certificate_pass', ''),
  ('company_currency_id',     '')
) AS v(key, value)
WHERE NOT EXISTS (SELECT 1 FROM "SystemConfig" sc WHERE sc.key = v.key);
