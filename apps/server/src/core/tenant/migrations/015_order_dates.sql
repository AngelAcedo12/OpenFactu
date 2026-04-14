-- 015_order_dates.sql
ALTER TABLE "{{schema}}"."PurchaseOrder" ADD COLUMN IF NOT EXISTS "deliveryDate" TIMESTAMP;
ALTER TABLE "{{schema}}"."PurchaseOrder" ADD COLUMN IF NOT EXISTS "documentDate" TIMESTAMP;
