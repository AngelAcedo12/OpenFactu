-- Turno partido en plantillas: segundo tramo opcional.
ALTER TABLE "{{schema}}"."ShiftTemplate"
  ADD COLUMN IF NOT EXISTS "secondStartTime" text,
  ADD COLUMN IF NOT EXISTS "secondEndTime" text;
