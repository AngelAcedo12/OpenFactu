import { Router } from 'express';
import { eq, desc } from 'drizzle-orm';
import * as schema from '../db/schema';
import crypto from 'crypto';
import { renderDocumentPdf } from '../core/documents/renderDocumentPdf';
import { logAudit } from '../utils/audit';

const router = Router();

// GET /orders/:id/pdf
router.get('/orders/:id/pdf', async (req: any, res) => {
  try {
    await renderDocumentPdf('PO', req.params.id, req.query.templateId as string | undefined, req.tenantClient, res);
  } catch (error: any) {
    console.error('[PurchaseOrder PDF] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET all orders
router.get('/orders', async (req: any, res) => {
  try {
    const orders = await req.tenantClient.select({
      id: schema.purchaseOrders.id,
      docNum: schema.purchaseOrders.docNum,
      seriesPrefix: schema.documentSeries.prefix,
      periodCode: schema.accountingPeriods.code,
      date: schema.purchaseOrders.date,
      partnerId: schema.purchaseOrders.partnerId,
      total: schema.purchaseOrders.total,
      status: schema.purchaseOrders.status,
      subtotal: schema.purchaseOrders.subtotal,
      taxTotal: schema.purchaseOrders.taxTotal
    })
      .from(schema.purchaseOrders)
      .leftJoin(schema.documentSeries, eq(schema.purchaseOrders.seriesId, schema.documentSeries.id))
      .leftJoin(schema.accountingPeriods, eq(schema.purchaseOrders.periodId, schema.accountingPeriods.id))
      .orderBy(desc(schema.purchaseOrders.date), desc(schema.purchaseOrders.createdAt));
      
    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST new order (Transaction)
router.post('/orders', async (req: any, res) => {
  const { seriesId, periodId, partnerId, date, deliveryDate, documentDate, warehouseId, lines } = req.body;

  try {
    // 1. Iniciar Transacción
    const result = await req.tenantClient.transaction(async (tx: any) => {
      // 2. Obtener y bloquear la Serie Documental
      const [series] = await tx.select()
        .from(schema.documentSeries)
        .where(eq(schema.documentSeries.id, seriesId));

      if (!series) throw new Error('Serie documental no encontrada');
      if (series.nextNumber > series.lastNumber) {
        throw new Error(`La serie ${series.name} ha alcanzado su límite numérico final (${series.lastNumber}).`);
      }

      const assignedDocNum = series.nextNumber;

      // 3. Actualizar contador autonumérico de la serie
      await tx.update(schema.documentSeries)
        .set({ nextNumber: assignedDocNum + 1 })
        .where(eq(schema.documentSeries.id, seriesId));

      // 4. Calcular totales
      let calculatedSubtotal = 0;
      let calculatedTaxTotal = 0;
      const breakdownMap: Record<string, { base: number, tax: number }> = {};

      const allTaxGroups = await tx.select().from(schema.taxGroups);
      const taxRateMap = allTaxGroups.reduce((acc: any, curr: any) => {
        acc[curr.id] = Number(curr.rate);
        return acc;
      }, {});

      const linesToInsert = lines.map((line: any, index: number) => {
        const lineSubtotal = Number(line.quantity) * Number(line.price);
        const taxRate = taxRateMap[line.taxGroupId] || 0;
        const lineTax = lineSubtotal * (taxRate / 100);

        calculatedSubtotal += lineSubtotal;
        calculatedTaxTotal += lineTax;

        const rateKey = String(taxRate);
        if (!breakdownMap[rateKey]) breakdownMap[rateKey] = { base: 0, tax: 0 };
        breakdownMap[rateKey].base += lineSubtotal;
        breakdownMap[rateKey].tax += lineTax;

        return {
          id: crypto.randomUUID(),
          lineNum: index + 1,
          itemId: line.itemId,
          warehouseId: line.warehouseId || warehouseId || null,
          batchNum: line.batchNum || null,
          orderedQty: String(line.quantity),
          receivedQty: '0',
          price: String(line.price),
          taxGroupId: line.taxGroupId || null,
          lineTotal: String(lineSubtotal + lineTax)
        };
      });

      // 5. Insertar Cabecera (Purchase Order)
      const orderId = crypto.randomUUID();
      const finalTotal = calculatedSubtotal + calculatedTaxTotal;
      const [header] = await tx.insert(schema.purchaseOrders)
        .values({
          id: orderId,
          seriesId,
          docNum: assignedDocNum,
          periodId,
          partnerId,
          date: new Date(date),
          deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
          documentDate: documentDate ? new Date(documentDate) : null,
          billToAddress: req.body.billToAddress || null,
          shipToAddress: req.body.shipToAddress || null,
          warehouseId: warehouseId || null,
          subtotal: String(calculatedSubtotal.toFixed(4)),
          taxTotal: String(calculatedTaxTotal.toFixed(4)),
          total: String(finalTotal.toFixed(4)),
          taxBreakdown: JSON.stringify(breakdownMap),
          status: 'O'
        })
        .returning();

      // 6. Insertar Líneas
      if (linesToInsert.length > 0) {
        const insertPayload = linesToInsert.map((l: any) => ({ ...l, orderId }));
        await tx.insert(schema.purchaseOrderLines).values(insertPayload);
      }

      return { header, assignedDocNum };
    });

    res.json(result);
    logAudit({
      tenantClient: req.tenantClient,
      tenantId: req.tenantId || '',
      userId: req.user?.id,
      entityType: 'PurchaseOrder',
      entityId: result.header?.id,
      action: 'CREATE',
      newValue: { docNum: result.assignedDocNum, partnerId: req.body.partnerId },
    });
  } catch (error: any) {
    console.error('Error al crear Pedido:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET order by ID with lines
router.get('/orders/:id', async (req: any, res) => {
  try {
    const [order] = await req.tenantClient.select({
      header: schema.purchaseOrders,
      seriesPrefix: schema.documentSeries.prefix,
      periodCode: schema.accountingPeriods.code
    })
      .from(schema.purchaseOrders)
      .leftJoin(schema.documentSeries, eq(schema.purchaseOrders.seriesId, schema.documentSeries.id))
      .leftJoin(schema.accountingPeriods, eq(schema.purchaseOrders.periodId, schema.accountingPeriods.id))
      .where(eq(schema.purchaseOrders.id, req.params.id));
      
    if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });
    
    const lines = await req.tenantClient.select()
      .from(schema.purchaseOrderLines)
      .where(eq(schema.purchaseOrderLines.orderId, order.header.id));
      
    res.json({ ...order.header, seriesPrefix: order.seriesPrefix, periodCode: order.periodCode, lines });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH update status (Manual Close)
router.patch('/orders/:id/status', async (req: any, res) => {
  const { status } = req.body;
  try {
    const [old] = await req.tenantClient.select().from(schema.purchaseOrders).where(eq(schema.purchaseOrders.id, req.params.id));
    const [updated] = await req.tenantClient.update(schema.purchaseOrders)
      .set({ status })
      .where(eq(schema.purchaseOrders.id, req.params.id))
      .returning();
    res.json(updated);
    if (old) logAudit({
      tenantClient: req.tenantClient,
      tenantId: req.tenantId || '',
      userId: req.user?.id,
      entityType: 'PurchaseOrder',
      entityId: req.params.id,
      action: 'UPDATE',
      oldValue: { status: old.status },
      newValue: { status },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
