-- 033_partner_fiscal_defaults.sql
-- ──────────────────────────────────────────────────────────────────
-- Añade a BusinessPartner los defaults fiscales y los datos bancarios
-- que facturas/pagos pueden heredar automáticamente al seleccionar
-- el interlocutor.
-- ──────────────────────────────────────────────────────────────────

ALTER TABLE "BusinessPartner"
  ADD COLUMN IF NOT EXISTS "defaultDocumentTypeId"  TEXT REFERENCES "DocumentType"(id),
  ADD COLUMN IF NOT EXISTS "defaultPaymentMethodId" TEXT REFERENCES "PaymentMethod"(id),
  ADD COLUMN IF NOT EXISTS "defaultPaymentTermId"   TEXT REFERENCES "PaymentTerm"(id),
  ADD COLUMN IF NOT EXISTS "defaultWithholdingRate" DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS "iban"                   TEXT,
  ADD COLUMN IF NOT EXISTS "bankName"               TEXT,
  ADD COLUMN IF NOT EXISTS "bankSwift"              TEXT;
