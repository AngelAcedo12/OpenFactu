import { Router } from 'express';
import { eq, sql, desc } from 'drizzle-orm';
import * as schema from '../db/schema';
import { DocumentEngine } from '../core/documents/DocumentEngine';
import { renderDocumentPdf } from '../core/documents/renderDocumentPdf';
import { logAudit } from '../utils/audit';

const router = Router();

// GET all invoices
router.get('/', async (req: any, res) => {
  try {
    const results = await req.tenantClient.select({
      id: schema.salesInvoices.id,
      docNum: schema.salesInvoices.docNum,
      seriesPrefix: schema.documentSeries.prefix,
      periodCode: schema.accountingPeriods.code,
      date: schema.salesInvoices.date,
      partnerId: schema.salesInvoices.partnerId,
      total: schema.salesInvoices.total,
      status: schema.salesInvoices.status,
      baseDocCode: sql<string | null>`(
        SELECT COALESCE(ds."prefix", '') || '-' || COALESCE(ap."code", '') || '-' || LPAD(sdn."docNum"::text, 6, '0')
        FROM "SalesDeliveryNote" sdn
        LEFT JOIN "DocumentSeries" ds ON sdn."seriesId" = ds."id"
        LEFT JOIN "AccountingPeriod" ap ON sdn."periodId" = ap."id"
        WHERE sdn."id" IN (
          SELECT "baseId" FROM "SalesInvoiceLine"
          WHERE "invoiceId" = ${schema.salesInvoices.id} AND "baseType" = 'SDN'
        )
        LIMIT 1
      )`
    })
      .from(schema.salesInvoices)
      .leftJoin(schema.documentSeries, eq(schema.salesInvoices.seriesId, schema.documentSeries.id))
      .leftJoin(schema.accountingPeriods, eq(schema.salesInvoices.periodId, schema.accountingPeriods.id))
      .orderBy(desc(schema.salesInvoices.date));
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET single invoice
router.get('/:id', async (req: any, res) => {
  try {
    const [header] = await req.tenantClient.select({
      header: schema.salesInvoices,
      seriesPrefix: schema.documentSeries.prefix,
      periodCode: schema.accountingPeriods.code,
    })
      .from(schema.salesInvoices)
      .leftJoin(schema.documentSeries, eq(schema.salesInvoices.seriesId, schema.documentSeries.id))
      .leftJoin(schema.accountingPeriods, eq(schema.salesInvoices.periodId, schema.accountingPeriods.id))
      .where(eq(schema.salesInvoices.id, req.params.id));
      
    if (!header) return res.status(404).json({ error: 'No encontrado' });

    const lines = await req.tenantClient.select().from(schema.salesInvoiceLines).where(eq(schema.salesInvoiceLines.invoiceId, req.params.id));
    
    const linesWithBatches = await Promise.all(lines.map(async (line: any) => {
      const batches = await req.tenantClient.select().from(schema.salesInvoiceLineBatches).where(eq(schema.salesInvoiceLineBatches.invoiceLineId, line.id));
      return { 
        ...line, 
        batchDetails: batches.map((b: any) => ({
          batchNum: b.batchNum,
          quantity: Number(b.quantity)
        }))
      };
    }));

    res.json({ ...header.header, seriesPrefix: header.seriesPrefix, periodCode: header.periodCode, lines: linesWithBatches });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /:id/pdf — Descarga el PDF de la factura
router.get('/:id/pdf', async (req: any, res) => {
  try {
    await renderDocumentPdf('SINV', req.params.id, req.query.templateId as string | undefined, req.tenantClient, res);
  } catch (error: any) {
    console.error('[SalesInvoice PDF] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST new sales invoice
router.post('/', async (req: any, res) => {
  try {
    const result = await DocumentEngine.create(
      req.tenantId,
      req.tenantClient,
      req.user,
      {
        tableName: 'salesInvoices',
        schemaTable: schema.salesInvoices,
        lineSchemaTable: schema.salesInvoiceLines,
        batchSchemaTable: schema.salesInvoiceLineBatches,
        eventPrefix: 'salesInvoice',
        stockAction: 'OUT',
        closeBaseDocuments: true
      },
      req.body
    );

    res.json(result);
    logAudit({
      tenantClient: req.tenantClient,
      tenantId: req.tenantId || '',
      userId: req.user?.id,
      entityType: 'SalesInvoice',
      entityId: result.id,
      action: 'CREATE',
      newValue: { docNum: result.docNum, total: req.body.total, partnerId: req.body.partnerId },
    });
  } catch (error: any) {
    console.error('[SalesInvoice API] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// CANCEL (Void logic) - TODO: Migrar a DocumentEngine.cancel
router.delete('/:id', async (req: any, res) => {
  try {
    const [old] = await req.tenantClient.select().from(schema.salesInvoices).where(eq(schema.salesInvoices.id, req.params.id));
    const result = await req.tenantClient.transaction(async (tx: any) => {
      const [header] = await tx.select().from(schema.salesInvoices).where(eq(schema.salesInvoices.id, req.params.id));
      if (!header) throw new Error('No encontrado');
      if (header.status === 'X') throw new Error('Ya está cancelado');

      await tx.update(schema.salesInvoices).set({ status: 'X' }).where(eq(schema.salesInvoices.id, req.params.id));
      return { success: true };
    });
    res.json(result);
    if (old) logAudit({
      tenantClient: req.tenantClient,
      tenantId: req.tenantId || '',
      userId: req.user?.id,
      entityType: 'SalesInvoice',
      entityId: req.params.id,
      action: 'DELETE',
      oldValue: old,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
