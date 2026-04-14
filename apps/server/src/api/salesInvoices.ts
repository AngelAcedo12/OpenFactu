import { Router } from 'express';
import { eq, sql, desc } from 'drizzle-orm';
import * as schema from '../db/schema';
import crypto from 'crypto';

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
      baseDocNum: sql`(SELECT "docNum" FROM "SalesDeliveryNote" WHERE id IN (SELECT "baseId" FROM "SalesInvoiceLine" WHERE "invoiceId" = ${schema.salesInvoices.id} AND "baseType" = 'SDN') LIMIT 1)`
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

// POST new sales invoice
router.post('/', async (req: any, res) => {
  const { seriesId, periodId, partnerId, date, lines } = req.body;

  try {
    const result = await req.tenantClient.transaction(async (tx: any) => {
      const [series] = await tx.select().from(schema.documentSeries).where(eq(schema.documentSeries.id, seriesId));
      if (!series) throw new Error('Serie no encontrada');
      const docNum = series.nextNumber;
      await tx.update(schema.documentSeries).set({ nextNumber: docNum + 1 }).where(eq(schema.documentSeries.id, seriesId));

      const invoiceId = crypto.randomUUID();
      let calculatedSubtotal = 0;
      let calculatedTaxTotal = 0;
      const breakdownMap: Record<string, { base: number, tax: number }> = {};

      const allTaxGroups = await tx.select().from(schema.taxGroups);
      const taxRateMap = allTaxGroups.reduce((acc: any, curr: any) => {
        acc[curr.id] = Number(curr.rate);
        return acc;
      }, {});

      await tx.insert(schema.salesInvoices).values({
        id: invoiceId,
        seriesId,
        docNum,
        periodId,
        partnerId,
        date: new Date(date),
        status: 'O',
        billToAddress: req.body.billToAddress || null,
        shipToAddress: req.body.shipToAddress || null,
        subtotal: '0',
        taxTotal: '0',
        total: '0',
        taxBreakdown: '{}'
      });

      for (const line of lines) {
        const [itemInfo] = await tx.select().from(schema.items).where(eq(schema.items.id, line.itemId));
        if (!itemInfo) throw new Error(`Artículo ${line.itemId} no encontrado`);

        const lineSubtotal = Number(line.quantity) * Number(line.price);
        const taxRate = taxRateMap[line.taxGroupId] || 0;
        const lineTax = lineSubtotal * (taxRate / 100);
        
        calculatedSubtotal += lineSubtotal;
        calculatedTaxTotal += lineTax;

        const rateKey = String(taxRate);
        if (!breakdownMap[rateKey]) breakdownMap[rateKey] = { base: 0, tax: 0 };
        breakdownMap[rateKey].base += lineSubtotal;
        breakdownMap[rateKey].tax += lineTax;

        const lineId = crypto.randomUUID();
        await tx.insert(schema.salesInvoiceLines).values({
          id: lineId,
          invoiceId,
          lineNum: (lines.indexOf(line) + 1),
          itemId: line.itemId,
          warehouseId: line.warehouseId || null,
          zoneId: line.zoneId || null,
          quantity: String(line.quantity),
          price: String(line.price),
          taxGroupId: line.taxGroupId || null,
          lineTotal: String(lineSubtotal + lineTax),
          baseType: line.baseType || null,
          baseId: line.baseId || null,
          baseLine: line.baseLine || null
        });

        if (line.batchDetails && Array.isArray(line.batchDetails)) {
          for (const bd of line.batchDetails) {
            await tx.insert(schema.salesInvoiceLineBatches).values({
              id: crypto.randomUUID(),
              invoiceLineId: lineId,
              batchNum: bd.batchNum,
              quantity: bd.quantity
            });

            // Si es factura directa, reducir stock de lotes
            if (!line.baseId) {
               const [existingBatch] = await tx.select().from(schema.itemBatches)
                 .where(sql`${schema.itemBatches.itemId} = ${line.itemId} AND ${schema.itemBatches.batchNum} = ${bd.batchNum}`);
               
               if (!existingBatch || Number(existingBatch.quantity) < Number(bd.quantity)) {
                 throw new Error(`Stock insuficiente en el lote ${bd.batchNum}`);
               }

               await tx.update(schema.itemBatches)
                 .set({ quantity: sql`${schema.itemBatches.quantity} - ${Number(bd.quantity)}` })
                 .where(eq(schema.itemBatches.id, existingBatch.id));
            }
          }
        }

        // Si es factura directa, reducir stock global
        if (!line.baseId) {
           if (Number(itemInfo.stock) < Number(line.quantity)) throw new Error('Stock insuficiente');
           await tx.update(schema.items)
             .set({ stock: sql`${schema.items.stock} - ${Number(line.quantity)}` })
             .where(eq(schema.items.id, line.itemId));
        }
      }

      const finalTotal = calculatedSubtotal + calculatedTaxTotal;
      await tx.update(schema.salesInvoices).set({ 
        subtotal: String(calculatedSubtotal.toFixed(4)),
        taxTotal: String(calculatedTaxTotal.toFixed(4)),
        total: String(finalTotal.toFixed(4)),
        taxBreakdown: JSON.stringify(breakdownMap)
      }).where(eq(schema.salesInvoices.id, invoiceId));

      // Cerrar albaranes base
      const baseIds = [...new Set(lines.filter((line: any) => line.baseType === 'SDN' && line.baseId).map((line: any) => line.baseId))];
      for (const bId of baseIds) {
        await tx.update(schema.salesDeliveryNotes).set({ status: 'C' }).where(eq(schema.salesDeliveryNotes.id, bId as string));
      }
      
      return { id: invoiceId, docNum };
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
