import { Router } from 'express';
import { eq, sql, desc } from 'drizzle-orm';
import * as schema from '../db/schema';
import crypto from 'crypto';
import { renderDocumentPdf } from '../core/documents/renderDocumentPdf';
import { getConfigSection } from '../core/config/systemConfigSection';
import { FLAGS_DEFAULTS } from '../core/config/appConfig';
import { logAudit } from '../utils/audit';

const router = Router();

// GET all delivery notes
router.get('/', async (req: any, res) => {
  try {
    const results = await req.tenantClient.select({
      id: schema.salesDeliveryNotes.id,
      docNum: schema.salesDeliveryNotes.docNum,
      seriesPrefix: schema.documentSeries.prefix,
      periodCode: schema.accountingPeriods.code,
      date: schema.salesDeliveryNotes.date,
      partnerId: schema.salesDeliveryNotes.partnerId,
      total: schema.salesDeliveryNotes.total,
      status: schema.salesDeliveryNotes.status,
      orderId: schema.salesDeliveryNotes.orderId,
      orderDocNum: schema.salesOrders.docNum,
      orderPrefix: sql`(SELECT "prefix" FROM "DocumentSeries" WHERE id = ${schema.salesOrders.seriesId})`
    })
      .from(schema.salesDeliveryNotes)
      .leftJoin(schema.salesOrders, eq(schema.salesDeliveryNotes.orderId, schema.salesOrders.id))
      .leftJoin(schema.documentSeries, eq(schema.salesDeliveryNotes.seriesId, schema.documentSeries.id))
      .leftJoin(schema.accountingPeriods, eq(schema.salesDeliveryNotes.periodId, schema.accountingPeriods.id))
      .orderBy(desc(schema.salesDeliveryNotes.date));
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET detail
router.get('/:id', async (req: any, res) => {
  try {
    const [header] = await req.tenantClient.select({
      header: schema.salesDeliveryNotes,
      seriesPrefix: schema.documentSeries.prefix,
      periodCode: schema.accountingPeriods.code,
      orderDocNum: schema.salesOrders.docNum,
      orderPrefix: sql`(SELECT "prefix" FROM "DocumentSeries" WHERE id = ${schema.salesOrders.seriesId})`
    })
      .from(schema.salesDeliveryNotes)
      .leftJoin(schema.salesOrders, eq(schema.salesDeliveryNotes.orderId, schema.salesOrders.id))
      .leftJoin(schema.documentSeries, eq(schema.salesDeliveryNotes.seriesId, schema.documentSeries.id))
      .leftJoin(schema.accountingPeriods, eq(schema.salesDeliveryNotes.periodId, schema.accountingPeriods.id))
      .where(eq(schema.salesDeliveryNotes.id, req.params.id));

    if (!header) return res.status(404).json({ error: 'No encontrado' });

    const lines = await req.tenantClient.select()
      .from(schema.salesDeliveryNoteLines)
      .where(eq(schema.salesDeliveryNoteLines.deliveryId, req.params.id));

    const linesWithBatches = await Promise.all(lines.map(async (line: any) => {
      const batches = await req.tenantClient.select()
        .from(schema.salesDeliveryNoteLineBatches)
        .where(eq(schema.salesDeliveryNoteLineBatches.deliveryLineId, line.id));
      
      return { 
        ...line, 
        batchDetails: batches.map((b: any) => ({
          batchNum: b.batchNum,
          quantity: Number(b.quantity)
        }))
      };
    }));

    res.json({
      ...header.header,
      seriesPrefix: header.seriesPrefix,
      periodCode: header.periodCode,
      orderDocNum: header.orderDocNum,
      orderPrefix: header.orderPrefix,
      lines: linesWithBatches
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /:id/pdf
router.get('/:id/pdf', async (req: any, res) => {
  try {
    await renderDocumentPdf('SDN', req.params.id, req.query.templateId as string | undefined, req.tenantClient, res);
  } catch (error: any) {
    console.error('[SalesDeliveryNote PDF] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST new sales delivery note (Relieved Goods)
router.post('/', async (req: any, res) => {
  const { seriesId, periodId, partnerId, orderId, date, lines, warehouseId } = req.body;

  try {
    const flags = await getConfigSection(req.tenantClient, 'flags', FLAGS_DEFAULTS);

    const result = await req.tenantClient.transaction(async (tx: any) => {
      // 1. Numeración
      const [series] = await tx.select().from(schema.documentSeries).where(eq(schema.documentSeries.id, seriesId));
      if (!series) throw new Error('Serie no encontrada');
      const docNum = series.nextNumber;
      await tx.update(schema.documentSeries).set({ nextNumber: docNum + 1 }).where(eq(schema.documentSeries.id, seriesId));

      const deliveryId = crypto.randomUUID();
      let calculatedSubtotal = 0;
      let calculatedTaxTotal = 0;
      const breakdownMap: Record<string, { base: number, tax: number }> = {};

      const allTaxGroups = await tx.select().from(schema.taxGroups);
      const taxRateMap = allTaxGroups.reduce((acc: any, curr: any) => {
        acc[curr.id] = Number(curr.rate);
        return acc;
      }, {});

      // 2. Insertar Cabecera Temporal
      await tx.insert(schema.salesDeliveryNotes).values({
        id: deliveryId,
        seriesId,
        docNum,
        periodId,
        partnerId,
        orderId: orderId || null,
        date: new Date(date),
        status: 'O',
        billToAddress: req.body.billToAddress || null,
        shipToAddress: req.body.shipToAddress || null,
        warehouseId: warehouseId || null,
        subtotal: '0',
        taxTotal: '0',
        total: '0',
        taxBreakdown: '{}'
      });

      // 3. Procesar Líneas y Stock
      for (const line of lines) {
        const [itemInfo] = await tx.select().from(schema.items).where(eq(schema.items.id, line.itemId));
        if (!itemInfo) throw new Error(`Artículo ${line.itemId} no encontrado`);

        // VALIDACIÓN STOCK (si allowNegativeStock está desactivado)
        if (!flags.allowNegativeStock && Number(itemInfo.stock) < Number(line.quantity)) {
           throw new Error(`Stock insuficiente para el artículo ${itemInfo.name}. Disponible: ${itemInfo.stock}, Requerido: ${line.quantity}`);
        }

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
        const targetWarehouse = line.warehouseId || warehouseId;

        // A. Insertar Línea
        await tx.insert(schema.salesDeliveryNoteLines).values({
          id: lineId,
          deliveryId,
          lineNum: line.lineNum || (lines.indexOf(line) + 1),
          itemId: line.itemId,
          warehouseId: targetWarehouse,
          zoneId: line.zoneId || null,
          quantity: String(line.quantity),
          price: String(line.price),
          taxGroupId: line.taxGroupId || null,
          lineTotal: String(lineSubtotal + lineTax),
          baseLine: line.baseLine || null
        });

        // B. Reducir Stock Global
        await tx.update(schema.items)
          .set({ stock: sql`${schema.items.stock} - ${Number(line.quantity)}` })
          .where(eq(schema.items.id, line.itemId));

        // C. Reducir Stock por Almacén / Ubicación
        if (targetWarehouse) {
          await tx.update(schema.itemWarehouseStocks)
            .set({ stock: sql`${schema.itemWarehouseStocks.stock} - ${Number(line.quantity)}`, updatedAt: new Date() })
            .where(sql`${schema.itemWarehouseStocks.itemId} = ${line.itemId} AND ${schema.itemWarehouseStocks.warehouseId} = ${targetWarehouse}`);
          
          if (line.zoneId) {
            await tx.update(schema.itemZoneStocks)
              .set({ stock: sql`${schema.itemZoneStocks.stock} - ${Number(line.quantity)}`, updatedAt: new Date() })
              .where(sql`${schema.itemZoneStocks.itemId} = ${line.itemId} AND ${schema.itemZoneStocks.warehouseId} = ${targetWarehouse} AND ${schema.itemZoneStocks.zoneId} = ${line.zoneId}`);
          }
        }

        // D. Gestionar LOTES / SERIES (Salida)
        const hasManualBatches = line.batchDetails && Array.isArray(line.batchDetails) && line.batchDetails.length > 0;

        if (hasManualBatches) {
          for (const bd of line.batchDetails) {
            // Validar que el lote existe y tiene stock
            const [existingBatch] = await tx.select().from(schema.itemBatches)
              .where(sql`${schema.itemBatches.itemId} = ${line.itemId} AND ${schema.itemBatches.batchNum} = ${bd.batchNum}`);

            if (!existingBatch || Number(existingBatch.quantity) < Number(bd.quantity)) {
               throw new Error(`Stock insuficiente en el lote ${bd.batchNum} para el artículo ${itemInfo.name}. Disponible: ${existingBatch?.quantity || 0}`);
            }

            await tx.insert(schema.salesDeliveryNoteLineBatches).values({
              id: crypto.randomUUID(),
              deliveryLineId: lineId,
              batchNum: bd.batchNum,
              quantity: bd.quantity
            });

            await tx.update(schema.itemBatches)
              .set({ quantity: sql`${schema.itemBatches.quantity} - ${Number(bd.quantity)}` })
              .where(eq(schema.itemBatches.id, existingBatch.id));
          }
        } else if (itemInfo.manageBy !== 'N') {
          // Sin lotes manuales: auto-asignar FIFO si el flag está activo
          if (!flags.autoConfirmBatches) {
            throw new Error(`El artículo ${itemInfo.name} requiere selección de lote/serie.`);
          }

          // Buscar lotes disponibles ordenados por caducidad (más próximos primero, nulls al final)
          const availableBatches = await tx.select()
            .from(schema.itemBatches)
            .where(sql`${schema.itemBatches.itemId} = ${line.itemId} AND ${schema.itemBatches.quantity} > 0`)
            .orderBy(sql`${schema.itemBatches.expiryDate} ASC NULLS LAST`);

          let remaining = Number(line.quantity);
          for (const batch of availableBatches) {
            if (remaining <= 0) break;
            const take = Math.min(Number(batch.quantity), remaining);
            if (take <= 0) continue;

            await tx.insert(schema.salesDeliveryNoteLineBatches).values({
              id: crypto.randomUUID(),
              deliveryLineId: lineId,
              batchNum: batch.batchNum,
              quantity: take,
            });

            await tx.update(schema.itemBatches)
              .set({ quantity: sql`${schema.itemBatches.quantity} - ${take}` })
              .where(eq(schema.itemBatches.id, batch.id));

            remaining -= take;
          }

          if (remaining > 0) {
            throw new Error(`Stock de lotes insuficiente para el artículo ${itemInfo.name}. Faltan ${remaining} unidades.`);
          }
        }

        // E. Lógica de Entrega Parcial en Pedido
        if (orderId && line.baseLine) {
           await tx.update(schema.salesOrderLines)
             .set({ deliveredQty: sql`${schema.salesOrderLines.deliveredQty} + ${Number(line.quantity)}` })
             .where(sql`${schema.salesOrderLines.orderId} = ${orderId} AND ${schema.salesOrderLines.lineNum} = ${line.baseLine}`);
        }
      }

      // 4. Actualizar Totales
      const finalTotal = calculatedSubtotal + calculatedTaxTotal;
      await tx.update(schema.salesDeliveryNotes)
        .set({ 
          subtotal: String(calculatedSubtotal.toFixed(4)),
          taxTotal: String(calculatedTaxTotal.toFixed(4)),
          total: String(finalTotal.toFixed(4)),
          taxBreakdown: JSON.stringify(breakdownMap)
        })
        .where(eq(schema.salesDeliveryNotes.id, deliveryId));

      // 5. Estado del Pedido
      if (orderId) {
        const soLines = await tx.select().from(schema.salesOrderLines).where(eq(schema.salesOrderLines.orderId, orderId));
        const allDelivered = soLines.every((l: any) => (Number(l.deliveredQty) + 0.0001) >= Number(l.orderedQty));
        const anyDelivered = soLines.some((l: any) => Number(l.deliveredQty) > 0);
        
        await tx.update(schema.salesOrders)
          .set({ status: allDelivered ? 'C' : (anyDelivered ? 'P' : 'O') })
          .where(eq(schema.salesOrders.id, orderId));
      }

      return { id: deliveryId, docNum };
    });

    res.json(result);
    logAudit({
      tenantClient: req.tenantClient,
      tenantId: req.tenantId || '',
      userId: req.user?.id,
      entityType: 'SalesDeliveryNote',
      entityId: result.id,
      action: 'CREATE',
      newValue: { docNum: result.docNum, partnerId: req.body.partnerId },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
