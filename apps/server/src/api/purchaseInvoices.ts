import { Router } from 'express';
import { eq, sql } from 'drizzle-orm';
import * as schema from '../db/schema';
import crypto from 'crypto';

const router = Router();

// GET all invoices
router.get('/', async (req: any, res) => {
  try {
    const results = await req.tenantClient.select({
      id: schema.purchaseInvoices.id,
      docNum: schema.purchaseInvoices.docNum,
      seriesPrefix: schema.documentSeries.prefix,
      periodCode: schema.accountingPeriods.code,
      date: schema.purchaseInvoices.date,
      partnerId: schema.purchaseInvoices.partnerId,
      total: schema.purchaseInvoices.total,
      status: schema.purchaseInvoices.status,
      baseDocNum: sql`(SELECT "docNum" FROM "PurchaseDeliveryNote" WHERE id IN (SELECT "baseId" FROM "PurchaseInvoiceLine" WHERE "invoiceId" = ${schema.purchaseInvoices.id} AND "baseType" = 'PDN') LIMIT 1)`,
      basePrefix: sql`(SELECT "DocumentSeries"."prefix" FROM "DocumentSeries" JOIN "PurchaseDeliveryNote" ON "PurchaseDeliveryNote"."seriesId" = "DocumentSeries"."id" WHERE "PurchaseDeliveryNote".id IN (SELECT "baseId" FROM "PurchaseInvoiceLine" WHERE "invoiceId" = ${schema.purchaseInvoices.id} AND "baseType" = 'PDN') LIMIT 1)`
    })
      .from(schema.purchaseInvoices)
      .leftJoin(schema.documentSeries, eq(schema.purchaseInvoices.seriesId, schema.documentSeries.id))
      .leftJoin(schema.accountingPeriods, eq(schema.purchaseInvoices.periodId, schema.accountingPeriods.id))
      .orderBy(sql`${schema.purchaseInvoices.date} DESC`);
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET single invoice
router.get('/:id', async (req: any, res) => {
  try {
    const [header] = await req.tenantClient.select({
      header: schema.purchaseInvoices,
      seriesPrefix: schema.documentSeries.prefix,
      periodCode: schema.accountingPeriods.code,
    })
      .from(schema.purchaseInvoices)
      .leftJoin(schema.documentSeries, eq(schema.purchaseInvoices.seriesId, schema.documentSeries.id))
      .leftJoin(schema.accountingPeriods, eq(schema.purchaseInvoices.periodId, schema.accountingPeriods.id))
      .where(eq(schema.purchaseInvoices.id, req.params.id));
      
    if (!header) return res.status(404).json({ error: 'Factura no encontrada' });

    const headerData = {
      ...header.header,
      seriesPrefix: header.seriesPrefix,
      periodCode: header.periodCode
    };

    const lines = await req.tenantClient.select().from(schema.purchaseInvoiceLines).where(eq(schema.purchaseInvoiceLines.invoiceId, req.params.id));
    
    // Get batches for each line
    const linesWithBatches = await Promise.all(lines.map(async (line: any) => {
      const batches = await req.tenantClient.select().from(schema.purchaseInvoiceLineBatches).where(eq(schema.purchaseInvoiceLineBatches.invoiceLineId, line.id));
      return { 
        ...line, 
        batchDetails: batches.map((b: any) => ({
          batchNum: b.batchNum,
          quantity: Number(b.quantity),
          expiryDate: b.expiryDate
        }))
      };
    }));

    res.json({ ...headerData, lines: linesWithBatches });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST new purchase invoice
router.post('/', async (req: any, res) => {
  const { seriesId, periodId, partnerId, date, lines } = req.body;

  try {
    const result = await req.tenantClient.transaction(async (tx: any) => {
      // 1. Numeración
      const [series] = await tx.select().from(schema.documentSeries).where(eq(schema.documentSeries.id, seriesId));
      if (!series) throw new Error('Serie no encontrada');
      const docNum = series.nextNumber;
      await tx.update(schema.documentSeries).set({ nextNumber: docNum + 1 }).where(eq(schema.documentSeries.id, seriesId));

      const invoiceId = crypto.randomUUID();
      let calculatedSubtotal = 0;
      let calculatedTaxTotal = 0;
      const breakdownMap: Record<string, { base: number, tax: number }> = {};

      // Obtener tasas de impuestos para cálculos
      const allTaxGroups = await tx.select().from(schema.taxGroups);
      const taxRateMap = allTaxGroups.reduce((acc: any, curr: any) => {
        acc[curr.id] = Number(curr.rate);
        return acc;
      }, {});

      // 2. Insertar Cabecera Temporal (Luego se actualizan los totales finales)
      const [header] = await tx.insert(schema.purchaseInvoices).values({
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
      }).returning();

      // 3. Procesar Líneas
      for (const line of lines) {
        // Validation: Verify if item requires batches
        const [itemInfo] = await tx.select().from(schema.items).where(eq(schema.items.id, line.itemId));
        if (!itemInfo) throw new Error(`Artículo ${line.itemId} no encontrado`);

        if (itemInfo.manageBy !== 'N') {
          const totalBatched = (line.batchDetails || []).reduce((acc: number, curr: any) => acc + Number(curr.quantity), 0);
          if (totalBatched < Number(line.quantity)) {
             throw new Error(`El artículo ${itemInfo.name} requiere trazabilidad. Cantidad pendiente: ${Number(line.quantity) - totalBatched}`);
          }
        }

        const lineSubtotal = Number(line.quantity) * Number(line.price);
        const taxRate = taxRateMap[line.taxGroupId] || 0;
        const lineTax = lineSubtotal * (taxRate / 100);
        
        calculatedSubtotal += lineSubtotal;
        calculatedTaxTotal += lineTax;

        // Breakdown logic
        const rateKey = String(taxRate);
        if (!breakdownMap[rateKey]) breakdownMap[rateKey] = { base: 0, tax: 0 };
        breakdownMap[rateKey].base += lineSubtotal;
        breakdownMap[rateKey].tax += lineTax;

        const lineId = crypto.randomUUID();

        // A. Insertar Línea de Factura
        await tx.insert(schema.purchaseInvoiceLines).values({
          id: lineId,
          invoiceId,
          lineNum: (lines.indexOf(line) + 1),
          itemId: line.itemId,
          quantity: String(line.quantity),
          price: String(line.price),
          taxGroupId: line.taxGroupId || null,
          lineTotal: String(lineSubtotal + lineTax),
          baseType: line.baseType || null,
          baseId: line.baseId || null,
          baseLine: line.baseLine || null
        });

        // B. Insertar Detalles de Lotes (Trazabilidad)
        if (line.batchDetails && Array.isArray(line.batchDetails)) {
          for (const bd of line.batchDetails) {
            // Validation for UNIQUE SERIALS (Only for direct invoices)
            if (!line.baseId && itemInfo.manageBy === 'S') {
               const [existing] = await tx.select().from(schema.itemBatches).where(sql`${schema.itemBatches.itemId} = ${line.itemId} AND ${schema.itemBatches.batchNum} = ${bd.batchNum}`);
               if (existing && Number(existing.quantity) > 0) {
                  throw new Error(`La serie ${bd.batchNum} ya existe en stock para el artículo ${itemInfo.name}`);
               }
               if (Number(bd.quantity) !== 1) {
                  throw new Error(`Un artículo gestionado por Serie solo puede tener cantidad 1 por serie (Serie: ${bd.batchNum})`);
               }
            }

            await tx.insert(schema.purchaseInvoiceLineBatches).values({
              id: crypto.randomUUID(),
              invoiceLineId: lineId,
              batchNum: bd.batchNum,
              quantity: bd.quantity,
              expiryDate: bd.expiryDate ? new Date(bd.expiryDate) : null
            });

            // Si entra directamente por factura (sin albarán base), incrementamos stock aquí
            if (!line.baseId) {
               // Incrementar stock del lote específico en maestros
               const [existingBatch] = await tx.select().from(schema.itemBatches)
                 .where(sql`${schema.itemBatches.itemId} = ${line.itemId} AND ${schema.itemBatches.batchNum} = ${bd.batchNum}`);
               
               if (existingBatch) {
                 await tx.update(schema.itemBatches)
                   .set({ quantity: sql`${schema.itemBatches.quantity} + ${Number(bd.quantity)}` })
                   .where(eq(schema.itemBatches.id, existingBatch.id));
               } else {
                 await tx.insert(schema.itemBatches).values({
                   id: crypto.randomUUID(),
                   itemId: line.itemId,
                   batchNum: bd.batchNum,
                   quantity: Number(bd.quantity),
                   expiryDate: bd.expiryDate ? new Date(bd.expiryDate) : null
                 });
               }
            }
          }
        }

        // C. Si es factura directa (sin albarán base), también movemos stock global
        if (!line.baseId) {
           await tx.update(schema.items)
             .set({ stock: sql`${schema.items.stock} + ${Number(line.quantity)}` })
             .where(eq(schema.items.id, line.itemId));
        }
      }

      // 4. Actualizar Totales Finales en Cabecera
      const finalTotal = calculatedSubtotal + calculatedTaxTotal;
      await tx.update(schema.purchaseInvoices)
        .set({ 
          subtotal: String(calculatedSubtotal.toFixed(4)),
          taxTotal: String(calculatedTaxTotal.toFixed(4)),
          total: String(finalTotal.toFixed(4)),
          taxBreakdown: JSON.stringify(breakdownMap)
        })
        .where(eq(schema.purchaseInvoices.id, invoiceId));

      // 5. Si viene de Albaranes, cerrarlos (SAP Style)
      const baseIds = [...new Set(lines.filter((line: any) => line.baseType === 'PDN' && line.baseId).map((line: any) => line.baseId))];
      for (const bId of baseIds) {
        await tx.update(schema.purchaseDeliveryNotes)
          .set({ status: 'C' })
          .where(eq(schema.purchaseDeliveryNotes.id, bId as string));
      }
      
      return { header, docNum };
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error en Factura de Compra:', error);
    res.status(500).json({ error: error.message });
  }
});

// CANCEL (Void logic)
router.delete('/:id', async (req: any, res) => {
  try {
    const result = await req.tenantClient.transaction(async (tx: any) => {
      const [header] = await tx.select().from(schema.purchaseInvoices).where(eq(schema.purchaseInvoices.id, req.params.id));
      if (!header) throw new Error('Factura no encontrada');
      if (header.status === 'X') throw new Error('La factura ya está cancelada');

      const lines = await tx.select().from(schema.purchaseInvoiceLines).where(eq(schema.purchaseInvoiceLines.invoiceId, req.params.id));

      for (const line of lines) {
        // A. Si NO tiene baseId, significa que entró stock directamente por la factura
        if (!line.baseId) {
          // Revertir Stock Global
          await tx.update(schema.items)
            .set({ stock: sql`${schema.items.stock} - ${Number(line.quantity)}` })
            .where(eq(schema.items.id, line.itemId));
          
          // Revertir Lotes
          const batches = await tx.select().from(schema.purchaseInvoiceLineBatches).where(eq(schema.purchaseInvoiceLineBatches.invoiceLineId, line.id));
          for (const bd of batches) {
             await tx.update(schema.itemBatches)
               .set({ quantity: sql`${schema.itemBatches.quantity} - ${Number(bd.quantity)}` })
               .where(sql`${schema.itemBatches.itemId} = ${line.itemId} AND ${schema.itemBatches.batchNum} = ${bd.batchNum}`);
          }
        } else if (line.baseType === 'PDN') {
          // Si venía de un Albarán, lo reabrimos
          await tx.update(schema.purchaseDeliveryNotes)
            .set({ status: 'O' })
            .where(eq(schema.purchaseDeliveryNotes.id, line.baseId));
        }
      }

      // Marcar factura como cancelada
      await tx.update(schema.purchaseInvoices)
        .set({ status: 'X' })
        .where(eq(schema.purchaseInvoices.id, req.params.id));

      return { success: true };
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
