-- Permitir NIF NULL en BusinessPartner. Antes era NOT NULL UNIQUE, lo que
-- impedía dar de alta partners sin NIF (típico en clientes ocasionales o
-- partners extranjeros aún sin verificar). Mantenemos la unicidad solo
-- cuando hay valor (índice único parcial), igual que con el barcode de Item.
ALTER TABLE "{{schema}}"."BusinessPartner" ALTER COLUMN "nif" DROP NOT NULL;

-- Sustituir el UNIQUE por un índice único parcial: dos NULL coexisten,
-- pero dos NIFs iguales siguen prohibidos.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'BusinessPartner_nif_unique'
      AND conrelid = '"{{schema}}"."BusinessPartner"'::regclass
  ) THEN
    EXECUTE 'ALTER TABLE "{{schema}}"."BusinessPartner" DROP CONSTRAINT "BusinessPartner_nif_unique"';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "BusinessPartner_nif_unique"
  ON "{{schema}}"."BusinessPartner" ("nif")
  WHERE "nif" IS NOT NULL;
