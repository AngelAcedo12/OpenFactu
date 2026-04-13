-- Migración 004: Factores de conversión en UoM
-- Añade soporte para unidades jerárquicas y magnitudes

ALTER TABLE "UnitOfMeasure" ADD COLUMN IF NOT EXISTS "baseValue" DECIMAL(12,4) DEFAULT 1.0000 NOT NULL;
ALTER TABLE "UnitOfMeasure" ADD COLUMN IF NOT EXISTS "baseUomId" TEXT;

-- Intentar añadir FK si no existe (Postgres no tiene error-safe para ADD CONSTRAINT directo en una línea como COLUMN)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_uom_base_uom') THEN
        ALTER TABLE "UnitOfMeasure" 
        ADD CONSTRAINT "fk_uom_base_uom" 
        FOREIGN KEY ("baseUomId") REFERENCES "UnitOfMeasure"(id);
    END IF;
END $$;
