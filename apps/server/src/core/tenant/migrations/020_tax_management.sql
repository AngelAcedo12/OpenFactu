ALTER TABLE "Item" ADD COLUMN "taxGroupId" text;
ALTER TABLE "Item" ADD CONSTRAINT "Item_taxGroupId_TaxGroup_id_fk" FOREIGN KEY ("taxGroupId") REFERENCES "{{schema}}"."TaxGroup"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "OrderHeader" ADD COLUMN "subtotal" numeric(12, 2) DEFAULT '0' NOT NULL;
ALTER TABLE "OrderHeader" ADD COLUMN "taxTotal" numeric(12, 2) DEFAULT '0' NOT NULL;
ALTER TABLE "OrderHeader" ADD COLUMN "taxBreakdown" text;

ALTER TABLE "DeliveryHeader" ADD COLUMN "subtotal" numeric(12, 2) DEFAULT '0' NOT NULL;
ALTER TABLE "DeliveryHeader" ADD COLUMN "taxTotal" numeric(12, 2) DEFAULT '0' NOT NULL;
ALTER TABLE "DeliveryHeader" ADD COLUMN "taxBreakdown" text;

ALTER TABLE "InvoiceHeader" ADD COLUMN "subtotal" numeric(12, 2) DEFAULT '0' NOT NULL;
ALTER TABLE "InvoiceHeader" ADD COLUMN "taxTotal" numeric(12, 2) DEFAULT '0' NOT NULL;
ALTER TABLE "InvoiceHeader" ADD COLUMN "taxBreakdown" text;

ALTER TABLE "PurchaseOrder" ADD COLUMN "subtotal" numeric(15, 4) DEFAULT '0' NOT NULL;
ALTER TABLE "PurchaseOrder" ADD COLUMN "taxTotal" numeric(15, 4) DEFAULT '0' NOT NULL;
ALTER TABLE "PurchaseOrder" ADD COLUMN "taxBreakdown" text;

ALTER TABLE "PurchaseDeliveryNote" ADD COLUMN "subtotal" numeric(15, 4) DEFAULT '0' NOT NULL;
ALTER TABLE "PurchaseDeliveryNote" ADD COLUMN "taxTotal" numeric(15, 4) DEFAULT '0' NOT NULL;
ALTER TABLE "PurchaseDeliveryNote" ADD COLUMN "taxBreakdown" text;

ALTER TABLE "PurchaseInvoice" ADD COLUMN "subtotal" numeric(15, 4) DEFAULT '0' NOT NULL;
ALTER TABLE "PurchaseInvoice" ADD COLUMN "taxTotal" numeric(15, 4) DEFAULT '0' NOT NULL;
ALTER TABLE "PurchaseInvoice" ADD COLUMN "taxBreakdown" text;
