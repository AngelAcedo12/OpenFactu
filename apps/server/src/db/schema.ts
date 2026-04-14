import { 
  pgTable, 
  text, 
  timestamp, 
  decimal, 
  doublePrecision, 
  integer,
  boolean,
  unique
} from 'drizzle-orm/pg-core';

/**
 * ESQUEMA GLOBAL (Esquema 'public')
 */
export const tenants = pgTable('Tenant', {
  id: text('id').primaryKey(),
  name: text('name').unique().notNull(),
  schemaName: text('schemaName').unique().notNull(),
  config: text('config'), // JSON almacenado como texto
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

export const globalUsers = pgTable('GlobalUser', {
  id: text('id').primaryKey(),
  email: text('email').unique().notNull(),
  username: text('username').unique().notNull(),
  password: text('password').notNull(),
  role: text('role').default('USER').notNull(),
  tenantId: text('tenantId').references(() => tenants.id),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

export const pluginFields = pgTable('PluginField', {
  id: text('id').primaryKey(),
  pluginId: text('pluginId').notNull(),
  tableName: text('tableName').notNull(),
  fieldName: text('fieldName').notNull(),
  fieldType: text('fieldType').notNull(),
  label: text('label').notNull(),
  isManaged: boolean('isManaged').default(true).notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
});

/**
 * ESQUEMA DE NEGOCIO (Multi-tenant)
 */

export const systemConfigs = pgTable('SystemConfig', {
  id: text('id').primaryKey(),
  key: text('key').unique().notNull(),
  value: text('value'),
  description: text('description'),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

// Grupos de Socios de Negocio (Tipos configurables)
export const partnerGroups = pgTable('PartnerGroup', {
  id: text('id').primaryKey(),
  code: text('code').unique().notNull(),
  name: text('name').notNull(),
  codePrefix: text('codePrefix'), // Ej: 'CLI' -> CLI-0001
  isCustomer: boolean('isCustomer').default(false).notNull(),
  isVendor: boolean('isVendor').default(false).notNull(),
});

// Maestro de Socios (Clientes / Proveedores)
export const businessPartners = pgTable('BusinessPartner', {
  id: text('id').primaryKey(),
  code: text('code').unique().notNull(),
  name: text('name').notNull(),
  nif: text('nif').unique().notNull(),
  foreignName: text('foreignName'),
  phone: text('phone'),
  email: text('email'),
  website: text('website'),
  groupId: text('groupId').references(() => partnerGroups.id),
  priceListId: text('priceListId').references(() => priceLists.id),
});

export const partnerAddresses = pgTable('PartnerAddress', {
  id: text('id').primaryKey(),
  partnerId: text('partnerId').notNull().references(() => businessPartners.id),
  name: text('name').notNull(),
  street: text('street'),
  city: text('city'),
  state: text('state'),
  zipCode: text('zipCode'),
  country: text('country'),
  type: text('type').default('B').notNull(),
  isDefault: boolean('isDefault').default(false).notNull(),
});

// --- CONFIGURACIÓN CONTABLE Y FISCAL ---

// Periodos Contables (Ejercicios)
export const accountingPeriods = pgTable('AccountingPeriod', {
  id: text('id').primaryKey(),
  code: text('code').unique().notNull(),
  name: text('name').notNull(),
  startDate: timestamp('startDate').notNull(),
  endDate: timestamp('endDate').notNull(),
  status: text('status').default('O').notNull(),
});

// Series de Documentos
export const documentSeries = pgTable('DocumentSeries', {
  id: text('id').primaryKey(),
  name: text('name').unique().notNull(),
  description: text('description'),
  periodId: text('periodId').notNull().references(() => accountingPeriods.id),
  docType: text('docType').notNull(),
  firstNumber: integer('firstNumber').notNull(),
  nextNumber: integer('nextNumber').notNull(),
  lastNumber: integer('lastNumber').notNull(),
  prefix: text('prefix'),
  suffix: text('suffix'),
  isDefault: boolean('isDefault').default(false).notNull(),
});

// Grupos de Impuestos
export const taxGroups = pgTable('TaxGroup', {
  id: text('id').primaryKey(),
  code: text('code').unique().notNull(),
  rate: decimal('rate', { precision: 5, scale: 2 }).notNull(),
});

// Listas de Precios
export const priceLists = pgTable('PriceList', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
});

export const itemPrices = pgTable('ItemPrice', {
  id: text('id').primaryKey(),
  priceListId: text('priceListId').notNull().references(() => priceLists.id),
  itemId: text('itemId').notNull().references(() => items.id),
  price: decimal('price', { precision: 12, scale: 4 }).notNull(),
}, (t) => ({
  unq: unique().on(t.priceListId, t.itemId)
}));

// Maestro de Artículos
export const items = pgTable('Item', {
  id: text('id').primaryKey(),
  code: text('code').unique().notNull(),
  name: text('name').notNull(),
  description: text('description'),
  uomId: text('uomId').notNull().references(() => unitsOfMeasure.id),
  categoryId: text('categoryId').references(() => categories.id),
  taxGroupId: text('taxGroupId').references(() => taxGroups.id),
  manageBy: text('manageBy').default('N').notNull(),
  basePrice: decimal('basePrice', { precision: 12, scale: 4 }).notNull(),
  stock: doublePrecision('stock').default(0).notNull(),
  minStock: doublePrecision('minStock').default(0).notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

// Trazabilidad
export const itemBatches = pgTable('ItemBatch', {
  id: text('id').primaryKey(),
  batchNum: text('batchNum').notNull(),
  itemId: text('itemId').notNull().references(() => items.id),
  quantity: doublePrecision('quantity').default(0).notNull(),
  expiryDate: timestamp('expiryDate'),
});

export const itemSerials = pgTable('ItemSerial', {
  id: text('id').primaryKey(),
  serialNum: text('serialNum').unique().notNull(),
  itemId: text('itemId').notNull().references(() => items.id),
  status: text('status').default('A').notNull(),
});

// Almacenes
export const warehouseZones = pgTable('WarehouseZone', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  warehouseId: text('warehouseId').references(() => warehouses.id),
});

export const warehouses = pgTable('Warehouse', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  location: text('location'),
  isDefault: boolean('isDefault').default(false).notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

export const itemWarehouseStocks = pgTable('ItemWarehouseStock', {
  itemId: text('itemId').notNull().references(() => items.id),
  warehouseId: text('warehouseId').notNull().references(() => warehouses.id),
  stock: doublePrecision('stock').default(0).notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
}, (t) => ({
  pk: unique().on(t.itemId, t.warehouseId),
}));

export const itemZoneStocks = pgTable('ItemZoneStock', {
  itemId: text('itemId').notNull().references(() => items.id),
  warehouseId: text('warehouseId').notNull().references(() => warehouses.id),
  zoneId: text('zoneId').notNull().references(() => warehouseZones.id),
  stock: doublePrecision('stock').default(0).notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
}, (t) => ({
  pk: unique().on(t.itemId, t.warehouseId, t.zoneId),
}));

export const unitsOfMeasure = pgTable('UnitOfMeasure', {
  id: text('id').primaryKey(),
  code: text('code').unique().notNull(),
  name: text('name').notNull(),
  baseValue: decimal('baseValue', { precision: 12, scale: 4 }).default('1.0000').notNull(),
  baseUomId: text('baseUomId').references((): any => unitsOfMeasure.id),
});

export const itemAlternativeUoms = pgTable('ItemAlternativeUom', {
  id: text('id').primaryKey(),
  itemId: text('itemId').notNull().references(() => items.id),
  uomId: text('uomId').notNull().references(() => unitsOfMeasure.id),
  factor: decimal('factor', { precision: 12, scale: 4 }).notNull(),
});

export const categories = pgTable('Category', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  codePrefix: text('codePrefix'),
  parentId: text('parentId').references((): any => categories.id),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

// --- VENTAS ---

export const salesOrders = pgTable('SalesOrder', {
  id: text('id').primaryKey(),
  seriesId: text('seriesId').references(() => documentSeries.id).notNull(),
  docNum: integer('docNum').notNull(),
  periodId: text('periodId').references(() => accountingPeriods.id).notNull(),
  partnerId: text('partnerId').references(() => businessPartners.id).notNull(),
  date: timestamp('date').notNull(),
  deliveryDate: timestamp('deliveryDate'),
  documentDate: timestamp('documentDate'),
  status: text('status').default('O').notNull(),
  billToAddress: text('billToAddress'),
  shipToAddress: text('shipToAddress'),
  warehouseId: text('warehouseId').references(() => warehouses.id),
  subtotal: decimal('subtotal', { precision: 15, scale: 4 }).default('0').notNull(),
  taxTotal: decimal('taxTotal', { precision: 15, scale: 4 }).default('0').notNull(),
  total: decimal('total', { precision: 15, scale: 4 }).default('0').notNull(),
  taxBreakdown: text('taxBreakdown'),
  createdAt: timestamp('createdAt').defaultNow(),
});

export const salesOrderLines = pgTable('SalesOrderLine', {
  id: text('id').primaryKey(),
  orderId: text('orderId').references(() => salesOrders.id).notNull(),
  lineNum: integer('lineNum').notNull(),
  itemId: text('itemId').references(() => items.id).notNull(),
  warehouseId: text('warehouseId').references(() => warehouses.id),
  zoneId: text('zoneId').references(() => warehouseZones.id),
  orderedQty: decimal('quantity', { precision: 12, scale: 4 }).notNull(),
  deliveredQty: decimal('deliveredQty', { precision: 12, scale: 4 }).default('0').notNull(),
  price: decimal('price', { precision: 15, scale: 4 }).notNull(),
  taxGroupId: text('taxGroupId').references(() => taxGroups.id),
  lineTotal: decimal('lineTotal', { precision: 15, scale: 4 }).notNull(),
});

export const salesDeliveryNotes = pgTable('SalesDeliveryNote', {
  id: text('id').primaryKey(),
  seriesId: text('seriesId').references(() => documentSeries.id).notNull(),
  docNum: integer('docNum').notNull(),
  periodId: text('periodId').references(() => accountingPeriods.id).notNull(),
  partnerId: text('partnerId').references(() => businessPartners.id).notNull(),
  orderId: text('orderId').references(() => salesOrders.id),
  date: timestamp('date').notNull(),
  status: text('status').default('O').notNull(),
  billToAddress: text('billToAddress'),
  shipToAddress: text('shipToAddress'),
  warehouseId: text('warehouseId').references(() => warehouses.id),
  subtotal: decimal('subtotal', { precision: 15, scale: 4 }).default('0').notNull(),
  taxTotal: decimal('taxTotal', { precision: 15, scale: 4 }).default('0').notNull(),
  total: decimal('total', { precision: 15, scale: 4 }).default('0').notNull(),
  taxBreakdown: text('taxBreakdown'),
  createdAt: timestamp('createdAt').defaultNow(),
});

export const salesDeliveryNoteLines = pgTable('SalesDeliveryNoteLine', {
  id: text('id').primaryKey(),
  deliveryId: text('deliveryId').references(() => salesDeliveryNotes.id).notNull(),
  lineNum: integer('lineNum').notNull(),
  itemId: text('itemId').references(() => items.id).notNull(),
  warehouseId: text('warehouseId').references(() => warehouses.id),
  zoneId: text('zoneId').references(() => warehouseZones.id),
  quantity: decimal('quantity', { precision: 12, scale: 4 }).notNull(),
  price: decimal('price', { precision: 15, scale: 4 }).notNull(),
  taxGroupId: text('taxGroupId').references(() => taxGroups.id),
  lineTotal: decimal('lineTotal', { precision: 15, scale: 4 }).notNull(),
  baseLine: integer('baseLine'),
});

export const salesDeliveryNoteLineBatches = pgTable('SalesDeliveryNoteLineBatch', {
  id: text('id').primaryKey(),
  deliveryLineId: text('deliveryLineId').notNull().references(() => salesDeliveryNoteLines.id),
  batchNum: text('batchNum').notNull(),
  quantity: doublePrecision('quantity').default(1).notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
});

export const salesInvoices = pgTable('SalesInvoice', {
  id: text('id').primaryKey(),
  seriesId: text('seriesId').references(() => documentSeries.id).notNull(),
  docNum: integer('docNum').notNull(),
  periodId: text('periodId').references(() => accountingPeriods.id).notNull(),
  partnerId: text('partnerId').references(() => businessPartners.id).notNull(),
  date: timestamp('date').notNull(),
  status: text('status').default('O').notNull(),
  billToAddress: text('billToAddress'),
  shipToAddress: text('shipToAddress'),
  subtotal: decimal('subtotal', { precision: 15, scale: 4 }).default('0').notNull(),
  taxTotal: decimal('taxTotal', { precision: 15, scale: 4 }).default('0').notNull(),
  total: decimal('total', { precision: 15, scale: 4 }).default('0').notNull(),
  taxBreakdown: text('taxBreakdown'),
  createdAt: timestamp('createdAt').defaultNow(),
});

export const salesInvoiceLines = pgTable('SalesInvoiceLine', {
  id: text('id').primaryKey(),
  invoiceId: text('invoiceId').references(() => salesInvoices.id).notNull(),
  lineNum: integer('lineNum').notNull(),
  itemId: text('itemId').references(() => items.id).notNull(),
  warehouseId: text('warehouseId').references(() => warehouses.id),
  zoneId: text('zoneId').references(() => warehouseZones.id),
  quantity: decimal('quantity', { precision: 12, scale: 4 }).notNull(),
  price: decimal('price', { precision: 15, scale: 4 }).notNull(),
  taxGroupId: text('taxGroupId').references(() => taxGroups.id),
  lineTotal: decimal('lineTotal', { precision: 15, scale: 4 }).notNull(),
  baseType: text('baseType'),
  baseId: text('baseId'),
  baseLine: integer('baseLine'),
});

export const salesInvoiceLineBatches = pgTable('SalesInvoiceLineBatch', {
  id: text('id').primaryKey(),
  invoiceLineId: text('invoiceLineId').notNull().references(() => salesInvoiceLines.id),
  batchNum: text('batchNum').notNull(),
  quantity: doublePrecision('quantity').default(1).notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
});


// ======= COMPRAS =======

export const purchaseOrders = pgTable('PurchaseOrder', {
  id: text('id').primaryKey(),
  seriesId: text('seriesId').references(() => documentSeries.id).notNull(),
  docNum: integer('docNum').notNull(),
  periodId: text('periodId').references(() => accountingPeriods.id).notNull(),
  partnerId: text('partnerId').references(() => businessPartners.id).notNull(),
  date: timestamp('date').notNull(),
  deliveryDate: timestamp('deliveryDate'),
  documentDate: timestamp('documentDate'),
  status: text('status').default('O').notNull(),
  billToAddress: text('billToAddress'),
  shipToAddress: text('shipToAddress'),
  warehouseId: text('warehouseId').references(() => warehouses.id),
  subtotal: decimal('subtotal', { precision: 15, scale: 4 }).default('0').notNull(),
  taxTotal: decimal('taxTotal', { precision: 15, scale: 4 }).default('0').notNull(),
  total: decimal('total', { precision: 15, scale: 4 }).default('0').notNull(),
  taxBreakdown: text('taxBreakdown'),
  createdAt: timestamp('createdAt').defaultNow(),
});

export const purchaseOrderLines = pgTable('PurchaseOrderLine', {
  id: text('id').primaryKey(),
  orderId: text('orderId').references(() => purchaseOrders.id).notNull(),
  lineNum: integer('lineNum').notNull(),
  itemId: text('itemId').references(() => items.id).notNull(),
  warehouseId: text('warehouseId').references(() => warehouses.id),
  zoneId: text('zoneId').references(() => warehouseZones.id),
  batchNum: text('batchNum'),
  orderedQty: decimal('quantity', { precision: 12, scale: 4 }).notNull(),
  receivedQty: decimal('receivedQty', { precision: 12, scale: 4 }).default('0').notNull(),
  price: decimal('price', { precision: 15, scale: 4 }).notNull(),
  taxGroupId: text('taxGroupId').references(() => taxGroups.id),
  lineTotal: decimal('lineTotal', { precision: 15, scale: 4 }).notNull(),
});

export const purchaseDeliveryNotes = pgTable('PurchaseDeliveryNote', {
  id: text('id').primaryKey(),
  seriesId: text('seriesId').references(() => documentSeries.id).notNull(),
  docNum: integer('docNum').notNull(),
  periodId: text('periodId').references(() => accountingPeriods.id).notNull(),
  partnerId: text('partnerId').references(() => businessPartners.id).notNull(),
  orderId: text('orderId').references(() => purchaseOrders.id),
  date: timestamp('date').notNull(),
  status: text('status').default('O').notNull(),
  billToAddress: text('billToAddress'),
  shipToAddress: text('shipToAddress'),
  warehouseId: text('warehouseId').references(() => warehouses.id),
  subtotal: decimal('subtotal', { precision: 15, scale: 4 }).default('0').notNull(),
  taxTotal: decimal('taxTotal', { precision: 15, scale: 4 }).default('0').notNull(),
  total: decimal('total', { precision: 15, scale: 4 }).default('0').notNull(),
  taxBreakdown: text('taxBreakdown'),
  createdAt: timestamp('createdAt').defaultNow(),
});

export const purchaseDeliveryNoteLines = pgTable('PurchaseDeliveryNoteLine', {
  id: text('id').primaryKey(),
  deliveryId: text('deliveryId').references(() => purchaseDeliveryNotes.id).notNull(),
  lineNum: integer('lineNum').notNull(),
  itemId: text('itemId').references(() => items.id).notNull(),
  warehouseId: text('warehouseId').references(() => warehouses.id),
  zoneId: text('zoneId').references(() => warehouseZones.id),
  batchNum: text('batchNum'),
  quantity: decimal('quantity', { precision: 12, scale: 4 }).notNull(),
  price: decimal('price', { precision: 15, scale: 4 }).notNull(),
  taxGroupId: text('taxGroupId').references(() => taxGroups.id),
  lineTotal: decimal('lineTotal', { precision: 15, scale: 4 }).notNull(),
  baseLine: integer('baseLine'),
});

export const purchaseInvoices = pgTable('PurchaseInvoice', {
  id: text('id').primaryKey(),
  seriesId: text('seriesId').references(() => documentSeries.id).notNull(),
  docNum: integer('docNum').notNull(),
  periodId: text('periodId').references(() => accountingPeriods.id).notNull(),
  partnerId: text('partnerId').references(() => businessPartners.id).notNull(),
  date: timestamp('date').notNull(),
  status: text('status').default('O').notNull(),
  billToAddress: text('billToAddress'),
  shipToAddress: text('shipToAddress'),
  subtotal: decimal('subtotal', { precision: 15, scale: 4 }).default('0').notNull(),
  taxTotal: decimal('taxTotal', { precision: 15, scale: 4 }).default('0').notNull(),
  total: decimal('total', { precision: 15, scale: 4 }).default('0').notNull(),
  taxBreakdown: text('taxBreakdown'),
  createdAt: timestamp('createdAt').defaultNow(),
});

export const purchaseInvoiceLines = pgTable('PurchaseInvoiceLine', {
  id: text('id').primaryKey(),
  invoiceId: text('invoiceId').references(() => purchaseInvoices.id).notNull(),
  lineNum: integer('lineNum').notNull(),
  itemId: text('itemId').references(() => items.id).notNull(),
  warehouseId: text('warehouseId').references(() => warehouses.id),
  zoneId: text('zoneId').references(() => warehouseZones.id),
  quantity: decimal('quantity', { precision: 12, scale: 4 }).notNull(),
  price: decimal('price', { precision: 15, scale: 4 }).notNull(),
  taxGroupId: text('taxGroupId').references(() => taxGroups.id),
  lineTotal: decimal('lineTotal', { precision: 15, scale: 4 }).notNull(),
  baseType: text('baseType'),
  baseId: text('baseId'),
  baseLine: integer('baseLine'),
});

export const purchaseDeliveryNoteLineBatches = pgTable('PurchaseDeliveryNoteLineBatch', {
  id: text('id').primaryKey(),
  deliveryLineId: text('deliveryLineId').notNull().references(() => purchaseDeliveryNoteLines.id),
  batchNum: text('batchNum').notNull(),
  quantity: doublePrecision('quantity').default(1).notNull(),
  expiryDate: timestamp('expiryDate'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
});

export const purchaseInvoiceLineBatches = pgTable('PurchaseInvoiceLineBatch', {
  id: text('id').primaryKey(),
  invoiceLineId: text('invoiceLineId').notNull().references(() => purchaseInvoiceLines.id),
  batchNum: text('batchNum').notNull(),
  quantity: doublePrecision('quantity').default(1).notNull(),
  expiryDate: timestamp('expiryDate'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
});
