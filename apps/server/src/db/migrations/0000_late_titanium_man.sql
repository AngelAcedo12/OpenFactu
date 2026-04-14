CREATE TABLE "Tenant" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"schemaName" text NOT NULL,
	"config" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Tenant_name_unique" UNIQUE("name"),
	CONSTRAINT "Tenant_schemaName_unique" UNIQUE("schemaName")
);
--> statement-breakpoint
CREATE TABLE "GlobalUser" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"role" text DEFAULT 'USER' NOT NULL,
	"tenantId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "GlobalUser_email_unique" UNIQUE("email"),
	CONSTRAINT "GlobalUser_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "PluginField" (
	"id" text PRIMARY KEY NOT NULL,
	"pluginId" text NOT NULL,
	"tableName" text NOT NULL,
	"fieldName" text NOT NULL,
	"fieldType" text NOT NULL,
	"label" text NOT NULL,
	"isManaged" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "PartnerGroup" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"codePrefix" text,
	"isCustomer" boolean DEFAULT false NOT NULL,
	"isVendor" boolean DEFAULT false NOT NULL,
	CONSTRAINT "PartnerGroup_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "BusinessPartner" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"nif" text NOT NULL,
	"foreignName" text,
	"phone" text,
	"email" text,
	"website" text,
	"groupId" text,
	"priceListId" text,
	CONSTRAINT "BusinessPartner_code_unique" UNIQUE("code"),
	CONSTRAINT "BusinessPartner_nif_unique" UNIQUE("nif")
);
--> statement-breakpoint
CREATE TABLE "PartnerAddress" (
	"id" text PRIMARY KEY NOT NULL,
	"partnerId" text NOT NULL,
	"name" text NOT NULL,
	"street" text,
	"city" text,
	"state" text,
	"zipCode" text,
	"country" text,
	"type" text DEFAULT 'B' NOT NULL,
	"isDefault" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "AccountingPeriod" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"startDate" timestamp NOT NULL,
	"endDate" timestamp NOT NULL,
	"status" text DEFAULT 'O' NOT NULL,
	CONSTRAINT "AccountingPeriod_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "DocumentSeries" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"periodId" text NOT NULL,
	"docType" text NOT NULL,
	"firstNumber" integer NOT NULL,
	"nextNumber" integer NOT NULL,
	"lastNumber" integer NOT NULL,
	"prefix" text,
	"suffix" text,
	"isDefault" boolean DEFAULT false NOT NULL,
	CONSTRAINT "DocumentSeries_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "TaxGroup" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"rate" numeric(5, 2) NOT NULL,
	CONSTRAINT "TaxGroup_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "PriceList" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ItemPrice" (
	"id" text PRIMARY KEY NOT NULL,
	"priceListId" text NOT NULL,
	"itemId" text NOT NULL,
	"price" numeric(12, 4) NOT NULL,
	CONSTRAINT "ItemPrice_priceListId_itemId_unique" UNIQUE("priceListId","itemId")
);
--> statement-breakpoint
CREATE TABLE "Item" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"uomId" text NOT NULL,
	"categoryId" text,
	"manageBy" text DEFAULT 'N' NOT NULL,
	"basePrice" numeric(12, 4) NOT NULL,
	"stock" double precision DEFAULT 0 NOT NULL,
	"minStock" double precision DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Item_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "ItemBatch" (
	"id" text PRIMARY KEY NOT NULL,
	"batchNum" text NOT NULL,
	"itemId" text NOT NULL,
	"quantity" double precision DEFAULT 0 NOT NULL,
	"expiryDate" timestamp
);
--> statement-breakpoint
CREATE TABLE "ItemSerial" (
	"id" text PRIMARY KEY NOT NULL,
	"serialNum" text NOT NULL,
	"itemId" text NOT NULL,
	"status" text DEFAULT 'A' NOT NULL,
	CONSTRAINT "ItemSerial_serialNum_unique" UNIQUE("serialNum")
);
--> statement-breakpoint
CREATE TABLE "WarehouseZone" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"warehouseId" text
);
--> statement-breakpoint
CREATE TABLE "Warehouse" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"location" text,
	"isDefault" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ItemWarehouseStock" (
	"itemId" text NOT NULL,
	"warehouseId" text NOT NULL,
	"stock" double precision DEFAULT 0 NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ItemWarehouseStock_itemId_warehouseId_unique" UNIQUE("itemId","warehouseId")
);
--> statement-breakpoint
CREATE TABLE "UnitOfMeasure" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"baseValue" numeric(12, 4) DEFAULT '1.0000' NOT NULL,
	"baseUomId" text,
	CONSTRAINT "UnitOfMeasure_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "ItemAlternativeUom" (
	"id" text PRIMARY KEY NOT NULL,
	"itemId" text NOT NULL,
	"uomId" text NOT NULL,
	"factor" numeric(12, 4) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Category" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"codePrefix" text,
	"parentId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "OrderHeader" (
	"id" text PRIMARY KEY NOT NULL,
	"docNum" integer NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"partnerId" text NOT NULL,
	"status" text DEFAULT 'O' NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	CONSTRAINT "OrderHeader_docNum_unique" UNIQUE("docNum")
);
--> statement-breakpoint
CREATE TABLE "OrderLine" (
	"id" text PRIMARY KEY NOT NULL,
	"orderId" text NOT NULL,
	"lineNum" integer NOT NULL,
	"itemId" text NOT NULL,
	"description" text NOT NULL,
	"quantity" double precision NOT NULL,
	"openQty" double precision NOT NULL,
	"uomId" text NOT NULL,
	"price" numeric(12, 4) NOT NULL,
	"taxGroupId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "DeliveryHeader" (
	"id" text PRIMARY KEY NOT NULL,
	"docNum" integer NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"partnerId" text NOT NULL,
	"status" text DEFAULT 'O' NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	CONSTRAINT "DeliveryHeader_docNum_unique" UNIQUE("docNum")
);
--> statement-breakpoint
CREATE TABLE "DeliveryLine" (
	"id" text PRIMARY KEY NOT NULL,
	"deliveryId" text NOT NULL,
	"lineNum" integer NOT NULL,
	"itemId" text NOT NULL,
	"description" text NOT NULL,
	"quantity" double precision NOT NULL,
	"openQty" double precision NOT NULL,
	"uomId" text NOT NULL,
	"price" numeric(12, 4) NOT NULL,
	"taxGroupId" text NOT NULL,
	"baseLineId" text
);
--> statement-breakpoint
CREATE TABLE "InvoiceHeader" (
	"id" text PRIMARY KEY NOT NULL,
	"docNum" integer NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"partnerId" text NOT NULL,
	"status" text DEFAULT 'O' NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	CONSTRAINT "InvoiceHeader_docNum_unique" UNIQUE("docNum")
);
--> statement-breakpoint
CREATE TABLE "InvoiceLine" (
	"id" text PRIMARY KEY NOT NULL,
	"invoiceId" text NOT NULL,
	"lineNum" integer NOT NULL,
	"itemId" text NOT NULL,
	"description" text NOT NULL,
	"quantity" double precision NOT NULL,
	"uomId" text NOT NULL,
	"price" numeric(12, 4) NOT NULL,
	"taxGroupId" text NOT NULL,
	"baseLineId" text
);
--> statement-breakpoint
CREATE TABLE "DocumentLineDist" (
	"id" text PRIMARY KEY NOT NULL,
	"orderLineId" text,
	"deliveryLineId" text,
	"invoiceLineId" text,
	"batchId" text,
	"serialId" text,
	"quantity" double precision DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "PurchaseOrder" (
	"id" text PRIMARY KEY NOT NULL,
	"seriesId" text NOT NULL,
	"docNum" integer NOT NULL,
	"periodId" text NOT NULL,
	"partnerId" text NOT NULL,
	"date" timestamp NOT NULL,
	"deliveryDate" timestamp,
	"documentDate" timestamp,
	"status" text DEFAULT 'O' NOT NULL,
	"billToAddress" text,
	"shipToAddress" text,
	"warehouseId" text,
	"total" numeric(15, 4) DEFAULT '0' NOT NULL,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "PurchaseOrderLine" (
	"id" text PRIMARY KEY NOT NULL,
	"orderId" text NOT NULL,
	"lineNum" integer NOT NULL,
	"itemId" text NOT NULL,
	"warehouseId" text,
	"batchNum" text,
	"quantity" numeric(12, 4) NOT NULL,
	"receivedQty" numeric(12, 4) DEFAULT '0' NOT NULL,
	"price" numeric(15, 4) NOT NULL,
	"taxGroupId" text,
	"lineTotal" numeric(15, 4) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "PurchaseDeliveryNote" (
	"id" text PRIMARY KEY NOT NULL,
	"seriesId" text NOT NULL,
	"docNum" integer NOT NULL,
	"periodId" text NOT NULL,
	"partnerId" text NOT NULL,
	"orderId" text,
	"date" timestamp NOT NULL,
	"status" text DEFAULT 'O' NOT NULL,
	"billToAddress" text,
	"shipToAddress" text,
	"warehouseId" text,
	"total" numeric(15, 4) DEFAULT '0' NOT NULL,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "PurchaseDeliveryNoteLine" (
	"id" text PRIMARY KEY NOT NULL,
	"deliveryId" text NOT NULL,
	"lineNum" integer NOT NULL,
	"itemId" text NOT NULL,
	"warehouseId" text,
	"batchNum" text,
	"quantity" numeric(12, 4) NOT NULL,
	"price" numeric(15, 4) NOT NULL,
	"taxGroupId" text,
	"lineTotal" numeric(15, 4) NOT NULL,
	"baseLine" integer
);
--> statement-breakpoint
CREATE TABLE "PurchaseInvoice" (
	"id" text PRIMARY KEY NOT NULL,
	"seriesId" text NOT NULL,
	"docNum" integer NOT NULL,
	"periodId" text NOT NULL,
	"partnerId" text NOT NULL,
	"date" timestamp NOT NULL,
	"status" text DEFAULT 'O' NOT NULL,
	"billToAddress" text,
	"shipToAddress" text,
	"total" numeric(15, 4) DEFAULT '0' NOT NULL,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "PurchaseInvoiceLine" (
	"id" text PRIMARY KEY NOT NULL,
	"invoiceId" text NOT NULL,
	"lineNum" integer NOT NULL,
	"itemId" text NOT NULL,
	"quantity" numeric(12, 4) NOT NULL,
	"price" numeric(15, 4) NOT NULL,
	"taxGroupId" text,
	"lineTotal" numeric(15, 4) NOT NULL,
	"baseType" text,
	"baseId" text,
	"baseLine" integer
);
--> statement-breakpoint
CREATE TABLE "PurchaseDeliveryNoteLineBatch" (
	"id" text PRIMARY KEY NOT NULL,
	"deliveryLineId" text NOT NULL,
	"batchNum" text NOT NULL,
	"quantity" double precision DEFAULT 1 NOT NULL,
	"expiryDate" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "PurchaseInvoiceLineBatch" (
	"id" text PRIMARY KEY NOT NULL,
	"invoiceLineId" text NOT NULL,
	"batchNum" text NOT NULL,
	"quantity" double precision DEFAULT 1 NOT NULL,
	"expiryDate" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "GlobalUser" ADD CONSTRAINT "GlobalUser_tenantId_Tenant_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "BusinessPartner" ADD CONSTRAINT "BusinessPartner_groupId_PartnerGroup_id_fk" FOREIGN KEY ("groupId") REFERENCES "public"."PartnerGroup"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "BusinessPartner" ADD CONSTRAINT "BusinessPartner_priceListId_PriceList_id_fk" FOREIGN KEY ("priceListId") REFERENCES "public"."PriceList"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PartnerAddress" ADD CONSTRAINT "PartnerAddress_partnerId_BusinessPartner_id_fk" FOREIGN KEY ("partnerId") REFERENCES "public"."BusinessPartner"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DocumentSeries" ADD CONSTRAINT "DocumentSeries_periodId_AccountingPeriod_id_fk" FOREIGN KEY ("periodId") REFERENCES "public"."AccountingPeriod"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ItemPrice" ADD CONSTRAINT "ItemPrice_priceListId_PriceList_id_fk" FOREIGN KEY ("priceListId") REFERENCES "public"."PriceList"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ItemPrice" ADD CONSTRAINT "ItemPrice_itemId_Item_id_fk" FOREIGN KEY ("itemId") REFERENCES "public"."Item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Item" ADD CONSTRAINT "Item_uomId_UnitOfMeasure_id_fk" FOREIGN KEY ("uomId") REFERENCES "public"."UnitOfMeasure"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Item" ADD CONSTRAINT "Item_categoryId_Category_id_fk" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ItemBatch" ADD CONSTRAINT "ItemBatch_itemId_Item_id_fk" FOREIGN KEY ("itemId") REFERENCES "public"."Item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ItemSerial" ADD CONSTRAINT "ItemSerial_itemId_Item_id_fk" FOREIGN KEY ("itemId") REFERENCES "public"."Item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "WarehouseZone" ADD CONSTRAINT "WarehouseZone_warehouseId_Warehouse_id_fk" FOREIGN KEY ("warehouseId") REFERENCES "public"."Warehouse"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ItemWarehouseStock" ADD CONSTRAINT "ItemWarehouseStock_itemId_Item_id_fk" FOREIGN KEY ("itemId") REFERENCES "public"."Item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ItemWarehouseStock" ADD CONSTRAINT "ItemWarehouseStock_warehouseId_Warehouse_id_fk" FOREIGN KEY ("warehouseId") REFERENCES "public"."Warehouse"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "UnitOfMeasure" ADD CONSTRAINT "UnitOfMeasure_baseUomId_UnitOfMeasure_id_fk" FOREIGN KEY ("baseUomId") REFERENCES "public"."UnitOfMeasure"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ItemAlternativeUom" ADD CONSTRAINT "ItemAlternativeUom_itemId_Item_id_fk" FOREIGN KEY ("itemId") REFERENCES "public"."Item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ItemAlternativeUom" ADD CONSTRAINT "ItemAlternativeUom_uomId_UnitOfMeasure_id_fk" FOREIGN KEY ("uomId") REFERENCES "public"."UnitOfMeasure"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_Category_id_fk" FOREIGN KEY ("parentId") REFERENCES "public"."Category"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "OrderHeader" ADD CONSTRAINT "OrderHeader_partnerId_BusinessPartner_id_fk" FOREIGN KEY ("partnerId") REFERENCES "public"."BusinessPartner"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_orderId_OrderHeader_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."OrderHeader"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_itemId_Item_id_fk" FOREIGN KEY ("itemId") REFERENCES "public"."Item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_uomId_UnitOfMeasure_id_fk" FOREIGN KEY ("uomId") REFERENCES "public"."UnitOfMeasure"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_taxGroupId_TaxGroup_id_fk" FOREIGN KEY ("taxGroupId") REFERENCES "public"."TaxGroup"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DeliveryHeader" ADD CONSTRAINT "DeliveryHeader_partnerId_BusinessPartner_id_fk" FOREIGN KEY ("partnerId") REFERENCES "public"."BusinessPartner"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DeliveryLine" ADD CONSTRAINT "DeliveryLine_deliveryId_DeliveryHeader_id_fk" FOREIGN KEY ("deliveryId") REFERENCES "public"."DeliveryHeader"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DeliveryLine" ADD CONSTRAINT "DeliveryLine_itemId_Item_id_fk" FOREIGN KEY ("itemId") REFERENCES "public"."Item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DeliveryLine" ADD CONSTRAINT "DeliveryLine_uomId_UnitOfMeasure_id_fk" FOREIGN KEY ("uomId") REFERENCES "public"."UnitOfMeasure"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DeliveryLine" ADD CONSTRAINT "DeliveryLine_taxGroupId_TaxGroup_id_fk" FOREIGN KEY ("taxGroupId") REFERENCES "public"."TaxGroup"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DeliveryLine" ADD CONSTRAINT "DeliveryLine_baseLineId_OrderLine_id_fk" FOREIGN KEY ("baseLineId") REFERENCES "public"."OrderLine"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "InvoiceHeader" ADD CONSTRAINT "InvoiceHeader_partnerId_BusinessPartner_id_fk" FOREIGN KEY ("partnerId") REFERENCES "public"."BusinessPartner"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_invoiceId_InvoiceHeader_id_fk" FOREIGN KEY ("invoiceId") REFERENCES "public"."InvoiceHeader"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_itemId_Item_id_fk" FOREIGN KEY ("itemId") REFERENCES "public"."Item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_uomId_UnitOfMeasure_id_fk" FOREIGN KEY ("uomId") REFERENCES "public"."UnitOfMeasure"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_taxGroupId_TaxGroup_id_fk" FOREIGN KEY ("taxGroupId") REFERENCES "public"."TaxGroup"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_baseLineId_DeliveryLine_id_fk" FOREIGN KEY ("baseLineId") REFERENCES "public"."DeliveryLine"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DocumentLineDist" ADD CONSTRAINT "DocumentLineDist_orderLineId_OrderLine_id_fk" FOREIGN KEY ("orderLineId") REFERENCES "public"."OrderLine"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DocumentLineDist" ADD CONSTRAINT "DocumentLineDist_deliveryLineId_DeliveryLine_id_fk" FOREIGN KEY ("deliveryLineId") REFERENCES "public"."DeliveryLine"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DocumentLineDist" ADD CONSTRAINT "DocumentLineDist_invoiceLineId_InvoiceLine_id_fk" FOREIGN KEY ("invoiceLineId") REFERENCES "public"."InvoiceLine"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DocumentLineDist" ADD CONSTRAINT "DocumentLineDist_batchId_ItemBatch_id_fk" FOREIGN KEY ("batchId") REFERENCES "public"."ItemBatch"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DocumentLineDist" ADD CONSTRAINT "DocumentLineDist_serialId_ItemSerial_id_fk" FOREIGN KEY ("serialId") REFERENCES "public"."ItemSerial"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_seriesId_DocumentSeries_id_fk" FOREIGN KEY ("seriesId") REFERENCES "public"."DocumentSeries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_periodId_AccountingPeriod_id_fk" FOREIGN KEY ("periodId") REFERENCES "public"."AccountingPeriod"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_partnerId_BusinessPartner_id_fk" FOREIGN KEY ("partnerId") REFERENCES "public"."BusinessPartner"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_warehouseId_Warehouse_id_fk" FOREIGN KEY ("warehouseId") REFERENCES "public"."Warehouse"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_orderId_PurchaseOrder_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."PurchaseOrder"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_itemId_Item_id_fk" FOREIGN KEY ("itemId") REFERENCES "public"."Item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_warehouseId_Warehouse_id_fk" FOREIGN KEY ("warehouseId") REFERENCES "public"."Warehouse"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_taxGroupId_TaxGroup_id_fk" FOREIGN KEY ("taxGroupId") REFERENCES "public"."TaxGroup"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PurchaseDeliveryNote" ADD CONSTRAINT "PurchaseDeliveryNote_seriesId_DocumentSeries_id_fk" FOREIGN KEY ("seriesId") REFERENCES "public"."DocumentSeries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PurchaseDeliveryNote" ADD CONSTRAINT "PurchaseDeliveryNote_periodId_AccountingPeriod_id_fk" FOREIGN KEY ("periodId") REFERENCES "public"."AccountingPeriod"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PurchaseDeliveryNote" ADD CONSTRAINT "PurchaseDeliveryNote_partnerId_BusinessPartner_id_fk" FOREIGN KEY ("partnerId") REFERENCES "public"."BusinessPartner"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PurchaseDeliveryNote" ADD CONSTRAINT "PurchaseDeliveryNote_orderId_PurchaseOrder_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."PurchaseOrder"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PurchaseDeliveryNote" ADD CONSTRAINT "PurchaseDeliveryNote_warehouseId_Warehouse_id_fk" FOREIGN KEY ("warehouseId") REFERENCES "public"."Warehouse"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PurchaseDeliveryNoteLine" ADD CONSTRAINT "PurchaseDeliveryNoteLine_deliveryId_PurchaseDeliveryNote_id_fk" FOREIGN KEY ("deliveryId") REFERENCES "public"."PurchaseDeliveryNote"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PurchaseDeliveryNoteLine" ADD CONSTRAINT "PurchaseDeliveryNoteLine_itemId_Item_id_fk" FOREIGN KEY ("itemId") REFERENCES "public"."Item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PurchaseDeliveryNoteLine" ADD CONSTRAINT "PurchaseDeliveryNoteLine_warehouseId_Warehouse_id_fk" FOREIGN KEY ("warehouseId") REFERENCES "public"."Warehouse"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PurchaseDeliveryNoteLine" ADD CONSTRAINT "PurchaseDeliveryNoteLine_taxGroupId_TaxGroup_id_fk" FOREIGN KEY ("taxGroupId") REFERENCES "public"."TaxGroup"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PurchaseInvoice" ADD CONSTRAINT "PurchaseInvoice_seriesId_DocumentSeries_id_fk" FOREIGN KEY ("seriesId") REFERENCES "public"."DocumentSeries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PurchaseInvoice" ADD CONSTRAINT "PurchaseInvoice_periodId_AccountingPeriod_id_fk" FOREIGN KEY ("periodId") REFERENCES "public"."AccountingPeriod"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PurchaseInvoice" ADD CONSTRAINT "PurchaseInvoice_partnerId_BusinessPartner_id_fk" FOREIGN KEY ("partnerId") REFERENCES "public"."BusinessPartner"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PurchaseInvoiceLine" ADD CONSTRAINT "PurchaseInvoiceLine_invoiceId_PurchaseInvoice_id_fk" FOREIGN KEY ("invoiceId") REFERENCES "public"."PurchaseInvoice"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PurchaseInvoiceLine" ADD CONSTRAINT "PurchaseInvoiceLine_itemId_Item_id_fk" FOREIGN KEY ("itemId") REFERENCES "public"."Item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PurchaseInvoiceLine" ADD CONSTRAINT "PurchaseInvoiceLine_taxGroupId_TaxGroup_id_fk" FOREIGN KEY ("taxGroupId") REFERENCES "public"."TaxGroup"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PurchaseDeliveryNoteLineBatch" ADD CONSTRAINT "PurchaseDeliveryNoteLineBatch_deliveryLineId_PurchaseDeliveryNoteLine_id_fk" FOREIGN KEY ("deliveryLineId") REFERENCES "public"."PurchaseDeliveryNoteLine"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PurchaseInvoiceLineBatch" ADD CONSTRAINT "PurchaseInvoiceLineBatch_invoiceLineId_PurchaseInvoiceLine_id_fk" FOREIGN KEY ("invoiceLineId") REFERENCES "public"."PurchaseInvoiceLine"("id") ON DELETE no action ON UPDATE no action;