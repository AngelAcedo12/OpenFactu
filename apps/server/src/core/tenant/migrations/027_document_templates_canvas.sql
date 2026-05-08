-- 027_document_templates_canvas.sql
-- Añade soporte de layout tipo canvas (Fase 1 del diseñador drag-and-drop).
-- Las plantillas existentes quedan marcadas como legacy (conservan su HTML).

ALTER TABLE "{{schema}}"."DocumentTemplate"
  ADD COLUMN IF NOT EXISTS "canvasLayout" JSONB,
  ADD COLUMN IF NOT EXISTS "layoutVersion" INTEGER DEFAULT 1 NOT NULL,
  ADD COLUMN IF NOT EXISTS "legacyHtml" BOOLEAN DEFAULT true NOT NULL;
