-- Tareas: añadir startAt / endAt para programar por horas (calendario semanal).
ALTER TABLE "{{schema}}"."Task" ADD COLUMN IF NOT EXISTS "startAt" timestamp;
ALTER TABLE "{{schema}}"."Task" ADD COLUMN IF NOT EXISTS "endAt" timestamp;
