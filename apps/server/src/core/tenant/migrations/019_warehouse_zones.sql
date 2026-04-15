CREATE TABLE "ItemZoneStock" (
	"itemId" text NOT NULL,
	"warehouseId" text NOT NULL,
	"zoneId" text NOT NULL,
	"stock" double precision DEFAULT 0 NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ItemZoneStock_itemId_warehouseId_zoneId_unique" UNIQUE("itemId","warehouseId","zoneId")
);

CREATE TABLE "SystemConfig" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text,
	"description" text,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "SystemConfig_key_unique" UNIQUE("key")
);

-- Nota: las tablas legacy OrderLine/DeliveryLine/InvoiceLine se eliminan en la
-- migración 021_sales_module.sql, por lo que aquí ya no se alteran para no
-- romper instalaciones nuevas donde DeliveryLine/InvoiceLine nunca existieron.
ALTER TABLE "PurchaseOrderLine" ADD COLUMN IF NOT EXISTS "zoneId" text;
ALTER TABLE "PurchaseDeliveryNoteLine" ADD COLUMN IF NOT EXISTS "zoneId" text;
ALTER TABLE "PurchaseInvoiceLine" ADD COLUMN IF NOT EXISTS "warehouseId" text;
ALTER TABLE "PurchaseInvoiceLine" ADD COLUMN IF NOT EXISTS "zoneId" text;
ALTER TABLE "ItemZoneStock" ADD CONSTRAINT "ItemZoneStock_itemId_Item_id_fk" FOREIGN KEY ("itemId") REFERENCES "{{schema}}"."Item"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "ItemZoneStock" ADD CONSTRAINT "ItemZoneStock_warehouseId_Warehouse_id_fk" FOREIGN KEY ("warehouseId") REFERENCES "{{schema}}"."Warehouse"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "ItemZoneStock" ADD CONSTRAINT "ItemZoneStock_zoneId_WarehouseZone_id_fk" FOREIGN KEY ("zoneId") REFERENCES "{{schema}}"."WarehouseZone"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_zoneId_WarehouseZone_id_fk" FOREIGN KEY ("zoneId") REFERENCES "{{schema}}"."WarehouseZone"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "PurchaseDeliveryNoteLine" ADD CONSTRAINT "PurchaseDeliveryNoteLine_zoneId_WarehouseZone_id_fk" FOREIGN KEY ("zoneId") REFERENCES "{{schema}}"."WarehouseZone"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "PurchaseInvoiceLine" ADD CONSTRAINT "PurchaseInvoiceLine_warehouseId_Warehouse_id_fk" FOREIGN KEY ("warehouseId") REFERENCES "{{schema}}"."Warehouse"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "PurchaseInvoiceLine" ADD CONSTRAINT "PurchaseInvoiceLine_zoneId_WarehouseZone_id_fk" FOREIGN KEY ("zoneId") REFERENCES "{{schema}}"."WarehouseZone"("id") ON DELETE no action ON UPDATE no action;
