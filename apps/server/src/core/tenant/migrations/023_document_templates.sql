-- 023_document_templates.sql

CREATE TABLE IF NOT EXISTS "{{schema}}"."DocumentTemplate" (
  "id" TEXT PRIMARY KEY,
  "docType" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "html" TEXT NOT NULL,
  "isDefault" BOOLEAN DEFAULT false NOT NULL,
  "createdAt" TIMESTAMP DEFAULT now() NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_doctpl_doctype" ON "{{schema}}"."DocumentTemplate" ("docType");

-- Solo una plantilla default por tipo de documento
CREATE UNIQUE INDEX IF NOT EXISTS "uq_doctpl_default_per_type"
  ON "{{schema}}"."DocumentTemplate" ("docType")
  WHERE "isDefault" = true;
