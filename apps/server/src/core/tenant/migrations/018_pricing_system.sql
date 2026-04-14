-- 018 Pricing System Migration

-- 1. Create ItemPrice table (PriceList was already in 001)
CREATE TABLE IF NOT EXISTS "{{schema}}"."ItemPrice" (
  "id" TEXT PRIMARY KEY,
  "priceListId" TEXT NOT NULL REFERENCES "{{schema}}"."PriceList"("id") ON DELETE CASCADE,
  "itemId" TEXT NOT NULL REFERENCES "{{schema}}"."Item"("id") ON DELETE CASCADE,
  "price" DECIMAL(12, 4) NOT NULL,
  CONSTRAINT "unq_price_list_item" UNIQUE ("priceListId", "itemId")
);
