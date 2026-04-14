-- 022_fix_sales_order_line_columns.sql

-- Renombrar orderedQty a quantity para coincidir con el schema de Drizzle y la API
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'SalesOrderLine' 
    AND column_name = 'orderedQty'
    AND table_schema = '{{schema}}'
  ) THEN
    ALTER TABLE IF EXISTS "{{schema}}"."SalesOrderLine" RENAME COLUMN "orderedQty" TO "quantity";
  END IF;
END $$;
