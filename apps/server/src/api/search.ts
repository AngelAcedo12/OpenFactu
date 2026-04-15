import { Router } from 'express';
import { eq, or, ilike, sql, desc } from 'drizzle-orm';
import * as schema from '../db/schema';

const router = Router();

const LIMIT = 5;

/**
 * GET /api/search?q=xxx
 * Búsqueda global multi-entidad.
 */
router.get('/', async (req: any, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) {
    return res.json({
      partners: [], items: [], salesInvoices: [], purchaseInvoices: [],
      salesDeliveryNotes: [], purchaseDeliveryNotes: [], total: 0,
    });
  }

  const pattern = `%${q}%`;
  const db = req.tenantClient;

  try {
    // 1. Partners
    const partners = await db.select({
      id:   schema.businessPartners.id,
      code: schema.businessPartners.code,
      name: schema.businessPartners.name,
      nif:  schema.businessPartners.nif,
    })
      .from(schema.businessPartners)
      .where(or(
        ilike(schema.businessPartners.code, pattern),
        ilike(schema.businessPartners.name, pattern),
        ilike(schema.businessPartners.nif,  pattern),
      ))
      .limit(LIMIT);

    // 2. Items
    const items = await db.select({
      id:   schema.items.id,
      code: schema.items.code,
      name: schema.items.name,
    })
      .from(schema.items)
      .where(or(
        ilike(schema.items.code, pattern),
        ilike(schema.items.name, pattern),
      ))
      .limit(LIMIT);

    // 3-6. Documentos: busca por docCode formateado (prefix-period-docNum) o por partner
    const searchDocs = async (table: any) => {
      // Construye el docCode en SQL para poder hacer ILIKE sobre "FA-2026ER-000007"
      const docCodeExpr = sql`(
        COALESCE(${schema.documentSeries.prefix}, '')
        || '-' || COALESCE(${schema.accountingPeriods.code}, '')
        || '-' || LPAD(${table.docNum}::text, 6, '0')
      )`;

      const rows = await db.select({
        id:         table.id,
        docNum:     table.docNum,
        date:       table.date,
        total:      table.total,
        status:     table.status,
        prefix:     schema.documentSeries.prefix,
        periodCode: schema.accountingPeriods.code,
        partnerName:schema.businessPartners.name,
      })
        .from(table)
        .leftJoin(schema.documentSeries,    eq(table.seriesId,  schema.documentSeries.id))
        .leftJoin(schema.accountingPeriods, eq(table.periodId,  schema.accountingPeriods.id))
        .leftJoin(schema.businessPartners,  eq(table.partnerId, schema.businessPartners.id))
        .where(or(
          sql`${docCodeExpr} ILIKE ${pattern}`,
          ilike(schema.businessPartners.name, pattern),
          ilike(schema.documentSeries.prefix, pattern),
        ))
        .orderBy(desc(table.createdAt))
        .limit(LIMIT);

      return rows.map((r: any) => ({
        id:          r.id,
        docCode:     `${r.prefix || ''}-${r.periodCode || ''}-${String(r.docNum).padStart(6, '0')}`,
        partnerName: r.partnerName || '',
        date:        r.date,
        total:       Number(r.total),
        status:      r.status,
      }));
    };

    const [salesInvoices, purchaseInvoices, salesDeliveryNotes, purchaseDeliveryNotes] = await Promise.all([
      searchDocs(schema.salesInvoices),
      searchDocs(schema.purchaseInvoices),
      searchDocs(schema.salesDeliveryNotes),
      searchDocs(schema.purchaseDeliveryNotes),
    ]);

    const total =
      partners.length + items.length +
      salesInvoices.length + purchaseInvoices.length +
      salesDeliveryNotes.length + purchaseDeliveryNotes.length;

    res.json({ partners, items, salesInvoices, purchaseInvoices, salesDeliveryNotes, purchaseDeliveryNotes, total });
  } catch (error: any) {
    console.error('[Search] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
