import { Router } from 'express';
import { eq, desc, sql } from 'drizzle-orm';
import * as schema from '../db/schema';
import crypto from 'crypto';
import { renderDocumentPdf } from '../core/documents/renderDocumentPdf';
import { logAudit } from '../utils/audit';

const router = Router();

// GET /:id/pdf — montado antes que /:id para evitar que lo capture el route genérico
router.get('/:id/pdf', async (req: any, res) => {
  try {
    await renderDocumentPdf(
      'SO',
      req.params.id,
      req.query.templateId as string | undefined,
      req.tenantClient,
      res,
    );
  } catch (error: any) {
    console.error('[SalesOrder PDF] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET all orders
router.get('/', async (req: any, res) => {
  try {
    const orders = await req.tenantClient
      .select({
        id: schema.salesOrders.id,
        docNum: schema.salesOrders.docNum,
        seriesPrefix: schema.documentSeries.prefix,
        periodCode: schema.accountingPeriods.code,
        date: schema.salesOrders.date,
        partnerId: schema.salesOrders.partnerId,
        total: schema.salesOrders.total,
        status: schema.salesOrders.status,
        subtotal: schema.salesOrders.subtotal,
        taxTotal: schema.salesOrders.taxTotal,
      })
      .from(schema.salesOrders)
      .leftJoin(schema.documentSeries, eq(schema.salesOrders.seriesId, schema.documentSeries.id))
      .leftJoin(
        schema.accountingPeriods,
        eq(schema.salesOrders.periodId, schema.accountingPeriods.id),
      )
      .orderBy(desc(schema.salesOrders.date), desc(schema.salesOrders.createdAt));

    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST new sales order
router.post('/', async (req: any, res) => {
  const { seriesId, periodId, partnerId, date, deliveryDate, documentDate, warehouseId, lines } =
    req.body;

  try {
    const result = await req.tenantClient.transaction(async (tx: any) => {
      // 1. Numeración
      const [series] = await tx
        .select()
        .from(schema.documentSeries)
        .where(eq(schema.documentSeries.id, seriesId));
      if (!series) throw new Error('Serie no encontrada');
      if (series.nextNumber > series.lastNumber) throw new Error('Serie numerada agotada');

      const assignedDocNum = series.nextNumber;
      await tx
        .update(schema.documentSeries)
        .set({ nextNumber: assignedDocNum + 1 })
        .where(eq(schema.documentSeries.id, seriesId));

      // 2. Cálculos
      let calculatedSubtotal = 0;
      let calculatedTaxTotal = 0;
      const breakdownMap: Record<string, { base: number; tax: number }> = {};

      const allTaxGroups = await tx.select().from(schema.taxGroups);
      const taxRateMap = allTaxGroups.reduce((acc: any, curr: any) => {
        acc[curr.id] = Number(curr.rate);
        return acc;
      }, {});

      const orderId = crypto.randomUUID();
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
          orderId,
          lineNum: index + 1,
          itemId: line.itemId,
          warehouseId: line.warehouseId || warehouseId || null,
          orderedQty: String(line.quantity),
          deliveredQty: '0',
          price: String(line.price),
          uomId: line.uomId || null,
          uomFactor: line.uomFactor ? String(line.uomFactor) : '1.0000',
          taxGroupId: line.taxGroupId || null,
          lineTotal: String(lineSubtotal + lineTax),
        };
      });

      const finalTotal = calculatedSubtotal + calculatedTaxTotal;
      const [header] = await tx
        .insert(schema.salesOrders)
        .values({
          id: orderId,
          seriesId,
          docNum: assignedDocNum,
          periodId,
          partnerId,
          date: new Date(date),
          deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
          documentDate: documentDate ? new Date(documentDate) : null,
          status: 'O',
          billToAddress: req.body.billToAddress || null,
          shipToAddress: req.body.shipToAddress || null,
          warehouseId: warehouseId || null,
          subtotal: String(calculatedSubtotal.toFixed(4)),
          taxTotal: String(calculatedTaxTotal.toFixed(4)),
          total: String(finalTotal.toFixed(4)),
          taxBreakdown: JSON.stringify(breakdownMap),
        })
        .returning();

      if (linesToInsert.length > 0) {
        await tx.insert(schema.salesOrderLines).values(linesToInsert);
      }

      return { header, assignedDocNum };
    });

    res.json(result);
    logAudit({
      tenantClient: req.tenantClient,
      tenantId: req.tenantId || '',
      userId: req.user?.id,
      entityType: 'SalesOrder',
      entityId: result.header?.id,
      action: 'CREATE',
      newValue: { docNum: result.assignedDocNum, partnerId },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET by ID
router.get('/:id', async (req: any, res) => {
  try {
    const [order] = await req.tenantClient
      .select({
        header: schema.salesOrders,
        seriesPrefix: schema.documentSeries.prefix,
        periodCode: schema.accountingPeriods.code,
      })
      .from(schema.salesOrders)
      .leftJoin(schema.documentSeries, eq(schema.salesOrders.seriesId, schema.documentSeries.id))
      .leftJoin(
        schema.accountingPeriods,
        eq(schema.salesOrders.periodId, schema.accountingPeriods.id),
      )
      .where(eq(schema.salesOrders.id, req.params.id));

    if (!order) return res.status(404).json({ error: 'No encontrado' });

    const lines = await req.tenantClient
      .select()
      .from(schema.salesOrderLines)
      .where(eq(schema.salesOrderLines.orderId, req.params.id));

    res.json({
      ...order.header,
      seriesPrefix: order.seriesPrefix,
      periodCode: order.periodCode,
      lines,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /:id/cancel — Cancela un pedido de venta
router.post('/:id/cancel', async (req: any, res) => {
  try {
    const result = await req.tenantClient.transaction(async (tx: any) => {
      const [header] = await tx
        .select()
        .from(schema.salesOrders)
        .where(eq(schema.salesOrders.id, req.params.id));
      if (!header) throw new Error('Pedido no encontrado');
      if (header.status === 'X') throw new Error('El pedido ya está cancelado');

      // Comprobar que no hay albaranes vigentes vinculados
      const activeSdns = await tx
        .select()
        .from(schema.salesDeliveryNotes)
        .where(
          sql`${schema.salesDeliveryNotes.orderId} = ${req.params.id} AND ${schema.salesDeliveryNotes.status} != 'X'`,
        );
      if (activeSdns.length > 0) {
        throw new Error(
          'No se puede cancelar: existen albaranes vigentes vinculados. Cancela los albaranes primero.',
        );
      }

      await tx
        .update(schema.salesOrders)
        .set({ status: 'X' })
        .where(eq(schema.salesOrders.id, req.params.id));

      return { success: true, old: header };
    });

    res.json({ success: true });
    logAudit({
      tenantClient: req.tenantClient,
      tenantId: req.tenantId || '',
      userId: req.user?.id,
      entityType: 'SalesOrder',
      entityId: req.params.id,
      action: 'DELETE',
      oldValue: { status: result.old.status },
      newValue: { status: 'X' },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
