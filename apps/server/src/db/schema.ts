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

// Maestro de Socios (Clientes / Proveedores)
export const businessPartners = pgTable('BusinessPartner', {
  id: text('id').primaryKey(),
  code: text('code').unique().notNull(),
  name: text('name').notNull(),
  nif: text('nif').unique().notNull(),
  type: text('type').default('C').notNull(), // C: Customer, V: Vendor
  priceListId: text('priceListId').references(() => priceLists.id),
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
  manageBy: text('manageBy').default('N').notNull(), // N: None, B: Batch, S: Serial
  basePrice: decimal('basePrice', { precision: 12, scale: 4 }).notNull(),
  stock: doublePrecision('stock').default(0).notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

// Trazabilidad: Lotes
export const itemBatches = pgTable('ItemBatch', {
  id: text('id').primaryKey(),
  batchNum: text('batchNum').notNull(),
  itemId: text('itemId').notNull().references(() => items.id),
  quantity: doublePrecision('quantity').default(0).notNull(),
  expiryDate: timestamp('expiryDate'),
});

// Trazabilidad: Números de Serie
export const itemSerials = pgTable('ItemSerial', {
  id: text('id').primaryKey(),
  serialNum: text('serialNum').unique().notNull(),
  itemId: text('itemId').notNull().references(() => items.id),
  status: text('status').default('A').notNull(), // A: Available, S: Sold
});

// Almacenes
export const warehouses = pgTable('Warehouse', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  location: text('location'),
  isDefault: boolean('isDefault').default(false).notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

// Stock por Almacén
export const itemWarehouseStocks = pgTable('ItemWarehouseStock', {
  itemId: text('itemId').notNull().references(() => items.id),
  warehouseId: text('warehouseId').notNull().references(() => warehouses.id),
  stock: doublePrecision('stock').default(0).notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
}, (t) => ({
  pk: unique().on(t.itemId, t.warehouseId),
}));

// Otros Maestros
export const unitsOfMeasure = pgTable('UnitOfMeasure', {
  id: text('id').primaryKey(),
  code: text('code').unique().notNull(),
  name: text('name').notNull(),
  baseValue: decimal('baseValue', { precision: 12, scale: 4 }).default('1.0000').notNull(),
  baseUomId: text('baseUomId').references((): any => unitsOfMeasure.id),
});

export const categories = pgTable('Category', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  parentId: text('parentId').references(() => categories.id),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

// --- VENTAS ---

// Pedidos
export const orderHeaders = pgTable('OrderHeader', {
  id: text('id').primaryKey(),
  docNum: integer('docNum').unique().notNull(),
  date: timestamp('date').defaultNow().notNull(),
  partnerId: text('partnerId').notNull().references(() => businessPartners.id),
  status: text('status').default('O').notNull(), // O: Open, C: Closed, X: Cancelled
  total: decimal('total', { precision: 12, scale: 2 }).notNull(),
});

export const orderLines = pgTable('OrderLine', {
  id: text('id').primaryKey(),
  orderId: text('orderId').notNull().references(() => orderHeaders.id),
  lineNum: integer('lineNum').notNull(),
  itemId: text('itemId').notNull().references(() => items.id),
  description: text('description').notNull(),
  quantity: doublePrecision('quantity').notNull(),
  openQty: doublePrecision('openQty').notNull(),
  uomId: text('uomId').notNull().references(() => unitsOfMeasure.id),
  price: decimal('price', { precision: 12, scale: 4 }).notNull(),
  taxGroupId: text('taxGroupId').notNull().references(() => taxGroups.id),
});

// Albaranes
export const deliveryHeaders = pgTable('DeliveryHeader', {
  id: text('id').primaryKey(),
  docNum: integer('docNum').unique().notNull(),
  date: timestamp('date').defaultNow().notNull(),
  partnerId: text('partnerId').notNull().references(() => businessPartners.id),
  status: text('status').default('O').notNull(),
  total: decimal('total', { precision: 12, scale: 2 }).notNull(),
});

export const deliveryLines = pgTable('DeliveryLine', {
  id: text('id').primaryKey(),
  deliveryId: text('deliveryId').notNull().references(() => deliveryHeaders.id),
  lineNum: integer('lineNum').notNull(),
  itemId: text('itemId').notNull().references(() => items.id),
  description: text('description').notNull(),
  quantity: doublePrecision('quantity').notNull(),
  openQty: doublePrecision('openQty').notNull(),
  uomId: text('uomId').notNull().references(() => unitsOfMeasure.id),
  price: decimal('price', { precision: 12, scale: 4 }).notNull(),
  taxGroupId: text('taxGroupId').notNull().references(() => taxGroups.id),
  baseLineId: text('baseLineId').references(() => orderLines.id),
});

// Facturas
export const invoiceHeaders = pgTable('InvoiceHeader', {
  id: text('id').primaryKey(),
  docNum: integer('docNum').unique().notNull(),
  date: timestamp('date').defaultNow().notNull(),
  partnerId: text('partnerId').notNull().references(() => businessPartners.id),
  status: text('status').default('O').notNull(),
  total: decimal('total', { precision: 12, scale: 2 }).notNull(),
});

export const invoiceLines = pgTable('InvoiceLine', {
  id: text('id').primaryKey(),
  invoiceId: text('invoiceId').notNull().references(() => invoiceHeaders.id),
  lineNum: integer('lineNum').notNull(),
  itemId: text('itemId').notNull().references(() => items.id),
  description: text('description').notNull(),
  quantity: doublePrecision('quantity').notNull(),
  uomId: text('uomId').notNull().references(() => unitsOfMeasure.id),
  price: decimal('price', { precision: 12, scale: 4 }).notNull(),
  taxGroupId: text('taxGroupId').notNull().references(() => taxGroups.id),
  baseLineId: text('baseLineId').references(() => deliveryLines.id),
});

// Distribución de Traza
export const documentLineDist = pgTable('DocumentLineDist', {
  id: text('id').primaryKey(),
  orderLineId: text('orderLineId').references(() => orderLines.id),
  deliveryLineId: text('deliveryLineId').references(() => deliveryLines.id),
  invoiceLineId: text('invoiceLineId').references(() => invoiceLines.id),
  batchId: text('batchId').references(() => itemBatches.id),
  serialId: text('serialId').references(() => itemSerials.id),
  quantity: doublePrecision('quantity').default(1).notNull(),
});
