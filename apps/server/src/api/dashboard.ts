import { Router } from 'express';
import { eq, sql, and, gte, lte, desc, asc, lt } from 'drizzle-orm';
import * as schema from '../db/schema';

const router = Router();

router.get('/summary', async (req: any, res) => {
  try {
    const db = req.tenantClient;

    // 1. Periodo contable activo (status 'O' = Open). Si no hay, fallback al más reciente.
    const [activePeriod] = await db.select()
      .from(schema.accountingPeriods)
      .where(eq(schema.accountingPeriods.status, 'O'))
      .orderBy(desc(schema.accountingPeriods.startDate))
      .limit(1);

    let period = activePeriod;
    if (!period) {
      const [latest] = await db.select()
        .from(schema.accountingPeriods)
        .orderBy(desc(schema.accountingPeriods.startDate))
        .limit(1);
      period = latest;
    }

    if (!period) {
      return res.json({
        period: null,
        sales:      { total: 0, count: 0, prevTotal: 0, prevCount: 0 },
        purchases:  { total: 0, count: 0, prevTotal: 0, prevCount: 0 },
        stockAlerts:{ lowStock: [], expiringBatches: [] },
        recentDocs: [],
        topPartners:{ customers: [], suppliers: [] },
        receivables:{ open: 0, openCount: 0 },
        payables:   { open: 0, openCount: 0 },
      });
    }

    // 2. Periodo anterior (para comparativa)
    const [prevPeriod] = await db.select()
      .from(schema.accountingPeriods)
      .where(lt(schema.accountingPeriods.startDate, period.startDate))
      .orderBy(desc(schema.accountingPeriods.startDate))
      .limit(1);

    // 3. Totales de ventas y compras (actual + anterior)
    const aggDocs = async (table: any, periodId: string) => {
      const [row] = await db.select({
        total: sql<string>`COALESCE(SUM(${table.total}), 0)`,
        count: sql<string>`COUNT(*)`,
      })
        .from(table)
        .where(eq(table.periodId, periodId));
      return { total: Number(row?.total || 0), count: Number(row?.count || 0) };
    };

    const sales      = await aggDocs(schema.salesInvoices, period.id);
    const purchases  = await aggDocs(schema.purchaseInvoices, period.id);
    const prevSales     = prevPeriod ? await aggDocs(schema.salesInvoices, prevPeriod.id)     : { total: 0, count: 0 };
    const prevPurchases = prevPeriod ? await aggDocs(schema.purchaseInvoices, prevPeriod.id) : { total: 0, count: 0 };

    // 4. Cobros / pagos pendientes (status 'O' open en facturas)
    const aggOpen = async (table: any) => {
      const [row] = await db.select({
        total: sql<string>`COALESCE(SUM(${table.total}), 0)`,
        count: sql<string>`COUNT(*)`,
      })
        .from(table)
        .where(eq(table.status, 'O'));
      return { open: Number(row?.total || 0), openCount: Number(row?.count || 0) };
    };

    const receivables = await aggOpen(schema.salesInvoices);
    const payables    = await aggOpen(schema.purchaseInvoices);

    // 5. Stock crítico
    const lowStock = await db.select({
      id:       schema.items.id,
      code:     schema.items.code,
      name:     schema.items.name,
      stock:    schema.items.stock,
      minStock: schema.items.minStock,
    })
      .from(schema.items)
      .where(and(
        sql`${schema.items.minStock} > 0`,
        sql`${schema.items.stock} < ${schema.items.minStock}`,
      ))
      .orderBy(asc(schema.items.stock))
      .limit(10);

    // 6. Lotes próximos a caducar (próximos 30 días)
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + 30);

    const expiringBatches = await db.select({
      id:         schema.itemBatches.id,
      batchNum:   schema.itemBatches.batchNum,
      itemName:   schema.items.name,
      expiryDate: schema.itemBatches.expiryDate,
      quantity:   schema.itemBatches.quantity,
    })
      .from(schema.itemBatches)
      .leftJoin(schema.items, eq(schema.itemBatches.itemId, schema.items.id))
      .where(and(
        sql`${schema.itemBatches.expiryDate} IS NOT NULL`,
        lte(schema.itemBatches.expiryDate, horizon),
        gte(schema.itemBatches.expiryDate, new Date()),
      ))
      .orderBy(asc(schema.itemBatches.expiryDate))
      .limit(10);

    // 7. Documentos recientes (mezclando 4 tipos)
    const fetchRecent = async (table: any, type: string, route: string) => {
      const rows = await db.select({
        id:        table.id,
        docNum:    table.docNum,
        date:      table.date,
        total:     table.total,
        partnerId: table.partnerId,
        prefix:    schema.documentSeries.prefix,
        periodCode:schema.accountingPeriods.code,
        partnerName: schema.businessPartners.name,
        createdAt: table.createdAt,
      })
        .from(table)
        .leftJoin(schema.documentSeries,    eq(table.seriesId, schema.documentSeries.id))
        .leftJoin(schema.accountingPeriods, eq(table.periodId, schema.accountingPeriods.id))
        .leftJoin(schema.businessPartners,  eq(table.partnerId, schema.businessPartners.id))
        .orderBy(desc(table.createdAt))
        .limit(5);
      return rows.map((r: any) => ({
        type,
        route,
        id:    r.id,
        code:  `${r.prefix || ''}-${r.periodCode || ''}-${String(r.docNum).padStart(6, '0')}`,
        date:  r.date,
        total: Number(r.total),
        partnerName: r.partnerName || '',
        createdAt: r.createdAt,
      }));
    };

    const [recSI, recPI, recSDN, recPDN] = await Promise.all([
      fetchRecent(schema.salesInvoices,       'salesInvoice',       '/sales/invoices'),
      fetchRecent(schema.purchaseInvoices,    'purchaseInvoice',    '/purchases/invoices'),
      fetchRecent(schema.salesDeliveryNotes,  'salesDeliveryNote',  '/sales/delivery-notes'),
      fetchRecent(schema.purchaseDeliveryNotes,'purchaseDeliveryNote','/purchases/delivery-notes'),
    ]);

    const recentDocs = [...recSI, ...recPI, ...recSDN, ...recPDN]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    // 8. Top partners (clientes / proveedores) del periodo
    const topPartners = async (table: any) => {
      const rows = await db.select({
        id:    schema.businessPartners.id,
        name:  schema.businessPartners.name,
        total: sql<string>`COALESCE(SUM(${table.total}), 0)`,
      })
        .from(table)
        .leftJoin(schema.businessPartners, eq(table.partnerId, schema.businessPartners.id))
        .where(eq(table.periodId, period.id))
        .groupBy(schema.businessPartners.id, schema.businessPartners.name)
        .orderBy(sql`COALESCE(SUM(${table.total}), 0) DESC`)
        .limit(5);
      return rows
        .filter((r: any) => r.id)
        .map((r: any) => ({ id: r.id, name: r.name, total: Number(r.total) }));
    };

    const customers = await topPartners(schema.salesInvoices);
    const suppliers = await topPartners(schema.purchaseInvoices);

    res.json({
      period: {
        id:        period.id,
        code:      period.code,
        name:      period.name,
        startDate: period.startDate,
        endDate:   period.endDate,
      },
      sales:     { ...sales,     prevTotal: prevSales.total,     prevCount: prevSales.count },
      purchases: { ...purchases, prevTotal: prevPurchases.total, prevCount: prevPurchases.count },
      stockAlerts: { lowStock, expiringBatches },
      recentDocs,
      topPartners: { customers, suppliers },
      receivables,
      payables,
    });
  } catch (error: any) {
    console.error('[Dashboard] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
