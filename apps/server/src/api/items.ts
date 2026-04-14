import { Router } from 'express';
import * as schema from '../db/schema';
import { eq, desc, like, sql } from 'drizzle-orm';
import crypto from 'crypto';

const router = Router();

/**
 * GET /api/items
 */
router.get('/', async (req: any, res) => {
  try {
    const results = await req.tenantClient.select({
      id: schema.items.id,
      code: schema.items.code,
      name: schema.items.name,
      description: schema.items.description,
      uomId: schema.items.uomId,
      categoryId: schema.items.categoryId,
      basePrice: schema.items.basePrice,
      stock: schema.items.stock,
      manageBy: schema.items.manageBy,
      committed: sql`(SELECT COALESCE(SUM("quantity" - "deliveredQty"), 0) FROM "SalesOrderLine" WHERE "itemId" = ${schema.items.id})`,
      ordered: sql`(SELECT COALESCE(SUM("quantity" - "receivedQty"), 0) FROM "PurchaseOrderLine" WHERE "itemId" = ${schema.items.id})`
    })
      .from(schema.items)
      .orderBy(desc(schema.items.createdAt));
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/items
 */
router.post('/', async (req: any, res) => {
  let { code, name, uomId, basePrice, categoryId } = req.body;
  
  // Validación básica
  if (!name || !uomId) {
    return res.status(400).json({ error: 'Faltan campos obligatorios: Nombre y Unidad de Medida son requeridos.' });
  }

  try {
    // Autogeneración de Código
    if (!code) {
      if (!categoryId) {
        return res.status(400).json({ error: 'Se requiere especificar un Código manualmente o asignar una Categoría para autogenerarlo.' });
      }

      const [category] = await req.tenantClient.select({ codePrefix: schema.categories.codePrefix })
        .from(schema.categories)
        .where(eq(schema.categories.id, categoryId));

      if (!category || !category.codePrefix) {
        return res.status(400).json({ error: 'La categoría seleccionada no tiene un prefijo configurado para autogenerar el código.' });
      }

      const prefix = category.codePrefix.toUpperCase().trim();

      const [lastItem] = await req.tenantClient.select({ code: schema.items.code })
        .from(schema.items)
        .where(like(schema.items.code, `${prefix}-%`))
        .orderBy(desc(schema.items.code))
        .limit(1);

      let nextNum = 1;
      if (lastItem && lastItem.code) {
        const parts = lastItem.code.split('-');
        if (parts.length === 2 && !isNaN(parseInt(parts[1], 10))) {
          nextNum = parseInt(parts[1], 10) + 1;
        }
      }

      code = `${prefix}-${nextNum.toString().padStart(6, '0')}`;
      req.body.code = code; // Actualizar el body para la DB
    }

    // Validación estricta de trazabilidad
    if (req.body.manageBy && !['N', 'B', 'S'].includes(req.body.manageBy)) {
      return res.status(400).json({ error: 'Método de gestión inválido. Use N (Ninguno), B (Lote) o S (Serie).' });
    }

    const [item] = await req.tenantClient.insert(schema.items)
      .values({
        ...req.body,
        code,
        id: crypto.randomUUID(),
        basePrice: (basePrice ?? 0).toString() // Asegurar valor para el decimal
      })
      .returning();
    res.json(item);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/items/:id
 */
router.patch('/:id', async (req: any, res) => {
  const { id } = req.params;
  try {
    const [item] = await req.tenantClient.update(schema.items)
      .set({
        ...req.body,
        updatedAt: new Date()
      })
      .where(eq(schema.items.id, id))
      .returning();
    res.json(item);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/items/:id
 */
router.delete('/:id', async (req: any, res) => {
  const { id } = req.params;
  try {
    await req.tenantClient.delete(schema.items)
      .where(eq(schema.items.id, id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/items/:id/stock
 * Detailed stock by warehouse
 */
router.get('/:id/stock', async (req: any, res) => {
  const { id } = req.params;
  try {
    const warehouseStock = await req.tenantClient.select({
      warehouseId: schema.itemWarehouseStocks.warehouseId,
      warehouseName: schema.warehouses.name,
      stock: schema.itemWarehouseStocks.stock
    })
      .from(schema.itemWarehouseStocks)
      .leftJoin(schema.warehouses, eq(schema.itemWarehouseStocks.warehouseId, schema.warehouses.id))
      .where(eq(schema.itemWarehouseStocks.itemId, id));

    const zoneStock = await req.tenantClient.select({
      warehouseId: schema.itemZoneStocks.warehouseId,
      zoneId: schema.itemZoneStocks.zoneId,
      zoneName: schema.warehouseZones.name,
      stock: schema.itemZoneStocks.stock
    })
      .from(schema.itemZoneStocks)
      .leftJoin(schema.warehouseZones, eq(schema.itemZoneStocks.zoneId, schema.warehouseZones.id))
      .where(eq(schema.itemZoneStocks.itemId, id))
      .orderBy(desc(schema.itemZoneStocks.stock));

    const batches = await req.tenantClient.select({
      id: schema.itemBatches.id,
      batchNum: schema.itemBatches.batchNum,
      itemId: schema.itemBatches.itemId,
      quantity: schema.itemBatches.quantity,
      expiryDate: schema.itemBatches.expiryDate,
      zoneId: schema.purchaseDeliveryNoteLines.zoneId,
      zoneName: schema.warehouseZones.name,
      warehouseName: schema.warehouses.name
    })
      .from(schema.itemBatches)
      .leftJoin(schema.purchaseDeliveryNoteLineBatches, eq(schema.itemBatches.batchNum, schema.purchaseDeliveryNoteLineBatches.batchNum))
      .leftJoin(schema.purchaseDeliveryNoteLines, eq(schema.purchaseDeliveryNoteLineBatches.deliveryLineId, schema.purchaseDeliveryNoteLines.id))
      .leftJoin(schema.warehouseZones, eq(schema.purchaseDeliveryNoteLines.zoneId, schema.warehouseZones.id))
      .leftJoin(schema.warehouses, eq(schema.warehouseZones.warehouseId, schema.warehouses.id))
      .where(eq(schema.itemBatches.itemId, id))
      .orderBy(desc(schema.itemBatches.quantity));

    res.json({ warehouseStock, zoneStock, batches });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

/**
 * Gestión de Unidades Alternativas
 */

router.get('/:id/uoms', async (req: any, res) => {
  const { id } = req.params;
  try {
    const results = await req.tenantClient.select()
      .from(schema.itemAlternativeUoms)
      .where(eq(schema.itemAlternativeUoms.itemId, id));
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/uoms', async (req: any, res) => {
  const { id: itemId } = req.params;
  const { uomId, factor } = req.body;
  try {
    const [altUom] = await req.tenantClient.insert(schema.itemAlternativeUoms)
      .values({
        id: crypto.randomUUID(),
        itemId,
        uomId,
        factor: factor.toString()
      })
      .returning();
    res.json(altUom);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:itemId/uoms/:id', async (req: any, res) => {
  const { id } = req.params;
  try {
    await req.tenantClient.delete(schema.itemAlternativeUoms)
      .where(eq(schema.itemAlternativeUoms.id, id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
