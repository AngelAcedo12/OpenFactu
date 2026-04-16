import { ClientFactory } from '../core/tenant/ClientFactory';
import { sql } from 'drizzle-orm';

/**
 * Limpia el esquema PUBLIC de las tablas de negocio que deberían estar en los tenants.
 * Esto es necesario porque Drizzle Kit Push a veces las crea en public por error
 * o para limpiar residuos de Prisma.
 */
export async function cleanPublicSchema() {
  console.log('--- Iniciando limpieza de tablas de negocio en esquema PUBLIC (Drizzle) ---');

  const publicDb = ClientFactory.getClient('public');

  // Tablas que NO deben estar en public según el diseño multi-tenant
  const tablesToDrop = [
    // Artículos e inventario
    'Item',
    'ItemBatch',
    'ItemSerial',
    'ItemAlternativeUom',
    'ItemWarehouseStock',
    'ItemZoneStock',
    // Catálogos
    'Category',
    'UnitOfMeasure',
    'TaxGroup',
    'PriceList',
    'ItemPrice',
    // Almacenes
    'Warehouse',
    'WarehouseZone',
    // Interlocutores
    'BusinessPartner',
    'PartnerGroup',
    'PartnerAddress',
    // Documentos de compras
    'PurchaseOrder',
    'PurchaseOrderLine',
    'PurchaseDeliveryNote',
    'PurchaseDeliveryNoteLine',
    'PurchaseDeliveryNoteLineBatch',
    'PurchaseInvoice',
    'PurchaseInvoiceLine',
    'PurchaseInvoiceLineBatch',
    // Documentos de ventas
    'SalesOrder',
    'SalesOrderLine',
    'SalesDeliveryNote',
    'SalesDeliveryNoteLine',
    'SalesDeliveryNoteLineBatch',
    'SalesInvoice',
    'SalesInvoiceLine',
    'SalesInvoiceLineBatch',
    // Configuración de tenant
    'AccountingPeriod',
    'DocumentSeries',
    // Legacy
    'OrderLine',
    'OrderHeader',
    'DeliveryLine',
    'DeliveryHeader',
    'InvoiceLine',
    'InvoiceHeader',
    'DocumentLineDist',
  ];

  for (const table of tablesToDrop) {
    try {
      // Usamos comillas dobles para respetar mayúsculas de Drizzle
      await publicDb.execute(sql.raw(`DROP TABLE IF EXISTS "public"."${table}" CASCADE;`));
      console.log(`✅ Eliminada tabla huérfana: public.${table}`);
    } catch (err: any) {
      console.error(`❌ Error al eliminar ${table}:`, err.message);
    }
  }

  console.log(
    '--- Limpieza completada. Solo quedan las tablas Core (Tenant, GlobalUser, PluginField, AuditLog) en PUBLIC ---',
  );
}

// Si se ejecuta directamente (como script independiente)
if (require.main === module) {
  cleanPublicSchema()
    .then(() => ClientFactory.disconnectAll())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
