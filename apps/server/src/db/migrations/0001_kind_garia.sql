CREATE TABLE "ItemZoneStock" (
	"itemId" text NOT NULL,
	"warehouseId" text NOT NULL,
	"zoneId" text NOT NULL,
	"stock" double precision DEFAULT 0 NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ItemZoneStock_itemId_warehouseId_zoneId_unique" UNIQUE("itemId","warehouseId","zoneId")
);
--> statement-breakpoint
CREATE TABLE "SystemConfig" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text,
	"description" text,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "SystemConfig_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "OrderLine" ADD COLUMN "warehouseId" text;--> statement-breakpoint
ALTER TABLE "OrderLine" ADD COLUMN "zoneId" text;--> statement-breakpoint
ALTER TABLE "DeliveryLine" ADD COLUMN "warehouseId" text;--> statement-breakpoint
ALTER TABLE "DeliveryLine" ADD COLUMN "zoneId" text;--> statement-breakpoint
ALTER TABLE "InvoiceLine" ADD COLUMN "warehouseId" text;--> statement-breakpoint
ALTER TABLE "InvoiceLine" ADD COLUMN "zoneId" text;--> statement-breakpoint
ALTER TABLE "PurchaseOrderLine" ADD COLUMN "zoneId" text;--> statement-breakpoint
ALTER TABLE "PurchaseDeliveryNoteLine" ADD COLUMN "zoneId" text;--> statement-breakpoint
ALTER TABLE "PurchaseInvoiceLine" ADD COLUMN "warehouseId" text;--> statement-breakpoint
ALTER TABLE "PurchaseInvoiceLine" ADD COLUMN "zoneId" text;--> statement-breakpoint
ALTER TABLE "ItemZoneStock" ADD CONSTRAINT "ItemZoneStock_itemId_Item_id_fk" FOREIGN KEY ("itemId") REFERENCES "public"."Item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ItemZoneStock" ADD CONSTRAINT "ItemZoneStock_warehouseId_Warehouse_id_fk" FOREIGN KEY ("warehouseId") REFERENCES "public"."Warehouse"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ItemZoneStock" ADD CONSTRAINT "ItemZoneStock_zoneId_WarehouseZone_id_fk" FOREIGN KEY ("zoneId") REFERENCES "public"."WarehouseZone"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_warehouseId_Warehouse_id_fk" FOREIGN KEY ("warehouseId") REFERENCES "public"."Warehouse"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_zoneId_WarehouseZone_id_fk" FOREIGN KEY ("zoneId") REFERENCES "public"."WarehouseZone"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DeliveryLine" ADD CONSTRAINT "DeliveryLine_warehouseId_Warehouse_id_fk" FOREIGN KEY ("warehouseId") REFERENCES "public"."Warehouse"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DeliveryLine" ADD CONSTRAINT "DeliveryLine_zoneId_WarehouseZone_id_fk" FOREIGN KEY ("zoneId") REFERENCES "public"."WarehouseZone"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_warehouseId_Warehouse_id_fk" FOREIGN KEY ("warehouseId") REFERENCES "public"."Warehouse"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_zoneId_WarehouseZone_id_fk" FOREIGN KEY ("zoneId") REFERENCES "public"."WarehouseZone"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_zoneId_WarehouseZone_id_fk" FOREIGN KEY ("zoneId") REFERENCES "public"."WarehouseZone"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PurchaseDeliveryNoteLine" ADD CONSTRAINT "PurchaseDeliveryNoteLine_zoneId_WarehouseZone_id_fk" FOREIGN KEY ("zoneId") REFERENCES "public"."WarehouseZone"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PurchaseInvoiceLine" ADD CONSTRAINT "PurchaseInvoiceLine_warehouseId_Warehouse_id_fk" FOREIGN KEY ("warehouseId") REFERENCES "public"."Warehouse"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PurchaseInvoiceLine" ADD CONSTRAINT "PurchaseInvoiceLine_zoneId_WarehouseZone_id_fk" FOREIGN KEY ("zoneId") REFERENCES "public"."WarehouseZone"("id") ON DELETE no action ON UPDATE no action;