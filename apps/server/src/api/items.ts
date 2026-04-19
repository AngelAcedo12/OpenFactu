import { Router } from 'express';
import * as schema from '../db/schema';
import { eq, desc, like, sql, and } from 'drizzle-orm';
import crypto from 'crypto';
import { logAudit } from '../utils/audit';
import { HookManager } from '../core/plugins/HookManager';

const router = Router();

/**
 * GET /api/items
 */
router.get('/', async (req: any, res) => {
  try {
    const rows = await req.tenantClient
      .select({
        id: schema.items.id,
        code: schema.items.code,
        barcode: schema.items.barcode,
        name: schema.items.name,
        description: schema.items.description,
        uomId: schema.items.uomId,
        uomCode: schema.unitsOfMeasure.code,
        uomName: schema.unitsOfMeasure.name,
        categoryId: schema.items.categoryId,
        basePrice: schema.items.basePrice,
        stock: schema.items.stock,
        manageBy: schema.items.manageBy,
        committed: sql`(SELECT COALESCE(SUM("quantity" - "deliveredQty"), 0) FROM "SalesOrderLine" WHERE "itemId" = ${schema.items.id})`,
        ordered: sql`(SELECT COALESCE(SUM("quantity" - "receivedQty"), 0) FROM "PurchaseOrderLine" WHERE "itemId" = ${schema.items.id})`,
      })
      .from(schema.items)
      .leftJoin(schema.unitsOfMeasure, eq(schema.items.uomId, schema.unitsOfMeasure.id))
      .orderBy(desc(schema.items.createdAt));

    // Permitir a plugins inyectar/mutar filas
    const hookCtx = {
      tenantId: req.tenantId,
      entity: 'items',
      filters: req.query || {},
      rows,
      db: req.tenantClient,
    };
    await HookManager.trigger('items.list.afterFetch', hookCtx);

    res.json(hookCtx.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/items
 */
router.post('/', async (req: any, res) => {
  let { code, name, uomId, basePrice, categoryId, ...rest } = req.body;

  if (!name || !uomId) {
    return res
      .status(400)
      .json({ error: 'Faltan campos obligatorios: Nombre y Unidad de Medida son requeridos.' });
  }

  try {
    if (!code) {
      if (!categoryId) return res.status(400).json({ error: 'Se requiere Código o Categoría.' });
      const [category] = await req.tenantClient
        .select({ codePrefix: schema.categories.codePrefix })
        .from(schema.categories)
        .where(eq(schema.categories.id, categoryId));
      if (!category || !category.codePrefix)
        return res.status(400).json({ error: 'Categoría sin prefijo.' });
      const prefix = category.codePrefix.toUpperCase().trim();
      const [lastItem] = await req.tenantClient
        .select({ code: schema.items.code })
        .from(schema.items)
        .where(like(schema.items.code, `${prefix}-%`))
        .orderBy(desc(schema.items.code))
        .limit(1);
      let nextNum = 1;
      if (lastItem && lastItem.code) {
        const parts = lastItem.code.split('-');
        if (parts.length === 2 && !isNaN(parseInt(parts[1], 10)))
          nextNum = parseInt(parts[1], 10) + 1;
      }
      code = `${prefix}-${nextNum.toString().padStart(6, '0')}`;
    }

    if (req.body.manageBy && !['N', 'B', 'S'].includes(req.body.manageBy))
      return res.status(400).json({ error: 'Gestión inválida.' });

    const id = crypto.randomUUID();
    const [item] = await req.tenantClient
      .insert(schema.items)
      .values({ ...req.body, code, id, basePrice: (basePrice ?? 0).toString() })
      .returning();

    res.json(item);

    logAudit({
      tenantClient: req.tenantClient,
      tenantId: req.headers['x-tenant-id'] || '',
      userId: req.user?.id,
      entityType: 'Item',
      entityId: id,
      action: 'CREATE',
      newValue: item,
    });
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
    const [oldItem] = await req.tenantClient
      .select()
      .from(schema.items)
      .where(eq(schema.items.id, id));

    const [item] = await req.tenantClient
      .update(schema.items)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(schema.items.id, id))
      .returning();

    res.json(item);

    logAudit({
      tenantClient: req.tenantClient,
      tenantId: req.headers['x-tenant-id'] || '',
      userId: req.user?.id,
      entityType: 'Item',
      entityId: id,
      action: 'UPDATE',
      oldValue: oldItem,
      newValue: item,
    });
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
    const [oldItem] = await req.tenantClient
      .select()
      .from(schema.items)
      .where(eq(schema.items.id, id));

    await req.tenantClient.delete(schema.items).where(eq(schema.items.id, id));
    res.json({ success: true });

    if (oldItem) {
      logAudit({
        tenantClient: req.tenantClient,
        tenantId: req.headers['x-tenant-id'] || '',
        userId: req.user?.id,
        entityType: 'Item',
        entityId: id,
        action: 'DELETE',
        oldValue: oldItem,
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/items/:id/batches
 */
router.get('/:id/batches', async (req: any, res) => {
  const { id } = req.params;
  try {
    const serialsQuery = req.tenantClient
      .select({
        id: schema.itemSerials.id,
        batchNum: schema.itemSerials.serialNum,
        quantity: sql<number>`1`,
        expiryDate: sql<string | null>`NULL`,
        warehouseId: sql<string | null>`NULL`,
        warehouseName: sql<string | null>`NULL`,
        zoneName: sql<string | null>`NULL`,
        type: sql<string>`'S'`,
      })
      .from(schema.itemSerials)
      .where(eq(schema.itemSerials.itemId, id));

    const batchesQuery = req.tenantClient
      .select({
        id: schema.itemBatches.id,
        batchNum: schema.itemBatches.batchNum,
        quantity: schema.itemBatches.quantity,
        expiryDate: schema.itemBatches.expiryDate,
        warehouseId: schema.purchaseDeliveryNoteLines.warehouseId,
        warehouseName: schema.warehouses.name,
        zoneName: schema.warehouseZones.name,
        type: sql<string>`'B'`,
      })
      .from(schema.itemBatches)
      .leftJoin(
        schema.purchaseDeliveryNoteLineBatches,
        eq(schema.itemBatches.batchNum, schema.purchaseDeliveryNoteLineBatches.batchNum),
      )
      .leftJoin(
        schema.purchaseDeliveryNoteLines,
        and(
          eq(
            schema.purchaseDeliveryNoteLineBatches.deliveryLineId,
            schema.purchaseDeliveryNoteLines.id,
          ),
          eq(schema.itemBatches.itemId, schema.purchaseDeliveryNoteLines.itemId),
        ),
      )
      .leftJoin(
        schema.warehouseZones,
        eq(schema.purchaseDeliveryNoteLines.zoneId, schema.warehouseZones.id),
      )
      .leftJoin(
        schema.warehouses,
        eq(schema.purchaseDeliveryNoteLines.warehouseId, schema.warehouses.id),
      )
      .where(eq(schema.itemBatches.itemId, id));

    const [serials, batches] = await Promise.all([serialsQuery, batchesQuery]);
    let allResults = [...serials, ...batches];
    const uniqueResultsMap = new Map();
    for (const item of allResults) {
      const existing = uniqueResultsMap.get(item.batchNum);
      if (!existing || (!existing.warehouseName && item.warehouseName))
        uniqueResultsMap.set(item.batchNum, item);
    }
    const uniqueResults = Array.from(uniqueResultsMap.values());
    uniqueResults.sort((a, b) => {
      if (a.warehouseName && !b.warehouseName) return -1;
      if (!a.warehouseName && b.warehouseName) return 1;
      return b.quantity - a.quantity;
    });
    res.json(uniqueResults);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/items/:id/stock
 */
router.get('/:id/stock', async (req: any, res) => {
  const { id } = req.params;
  try {
    const warehouseStock = await req.tenantClient
      .select({
        warehouseId: schema.itemWarehouseStocks.warehouseId,
        warehouseName: schema.warehouses.name,
        stock: schema.itemWarehouseStocks.stock,
      })
      .from(schema.itemWarehouseStocks)
      .leftJoin(schema.warehouses, eq(schema.itemWarehouseStocks.warehouseId, schema.warehouses.id))
      .where(eq(schema.itemWarehouseStocks.itemId, id));
    const zoneStock = await req.tenantClient
      .select({
        warehouseId: schema.itemZoneStocks.warehouseId,
        zoneId: schema.itemZoneStocks.zoneId,
        zoneName: schema.warehouseZones.name,
        stock: schema.itemZoneStocks.stock,
      })
      .from(schema.itemZoneStocks)
      .leftJoin(schema.warehouseZones, eq(schema.itemZoneStocks.zoneId, schema.warehouseZones.id))
      .where(eq(schema.itemZoneStocks.itemId, id))
      .orderBy(desc(schema.itemZoneStocks.stock));
    const batches = await req.tenantClient
      .select({
        id: schema.itemBatches.id,
        batchNum: schema.itemBatches.batchNum,
        itemId: schema.itemBatches.itemId,
        quantity: schema.itemBatches.quantity,
        expiryDate: schema.itemBatches.expiryDate,
        zoneId: schema.purchaseDeliveryNoteLines.zoneId,
        zoneName: schema.warehouseZones.name,
        warehouseName: schema.warehouses.name,
      })
      .from(schema.itemBatches)
      .leftJoin(
        schema.purchaseDeliveryNoteLineBatches,
        eq(schema.itemBatches.batchNum, schema.purchaseDeliveryNoteLineBatches.batchNum),
      )
      .leftJoin(
        schema.purchaseDeliveryNoteLines,
        eq(
          schema.purchaseDeliveryNoteLineBatches.deliveryLineId,
          schema.purchaseDeliveryNoteLines.id,
        ),
      )
      .leftJoin(
        schema.warehouseZones,
        eq(schema.purchaseDeliveryNoteLines.zoneId, schema.warehouseZones.id),
      )
      .leftJoin(schema.warehouses, eq(schema.warehouseZones.warehouseId, schema.warehouses.id))
      .where(eq(schema.itemBatches.itemId, id))
      .orderBy(desc(schema.itemBatches.quantity));
    res.json({ warehouseStock, zoneStock, batches });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/uoms', async (req: any, res) => {
  const { id } = req.params;
  try {
    const [item] = await req.tenantClient
      .select({
        uomId: schema.items.uomId,
        uomCode: schema.unitsOfMeasure.code,
        uomName: schema.unitsOfMeasure.name,
      })
      .from(schema.items)
      .leftJoin(schema.unitsOfMeasure, eq(schema.items.uomId, schema.unitsOfMeasure.id))
      .where(eq(schema.items.id, id));

    const alternatives = await req.tenantClient
      .select({
        id: schema.itemAlternativeUoms.id,
        uomId: schema.itemAlternativeUoms.uomId,
        factor: schema.itemAlternativeUoms.factor,
        code: schema.unitsOfMeasure.code,
        name: schema.unitsOfMeasure.name,
      })
      .from(schema.itemAlternativeUoms)
      .leftJoin(
        schema.unitsOfMeasure,
        eq(schema.itemAlternativeUoms.uomId, schema.unitsOfMeasure.id),
      )
      .where(eq(schema.itemAlternativeUoms.itemId, id));

    const list = [
      ...(item
        ? [
            {
              uomId: item.uomId,
              code: item.uomCode,
              name: item.uomName,
              factor: '1.0000',
              isBase: true,
            },
          ]
        : []),
      ...alternatives.map((a: any) => ({
        id: a.id,
        uomId: a.uomId,
        code: a.code,
        name: a.name,
        factor: a.factor,
        isBase: false,
      })),
    ];
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/uoms', async (req: any, res) => {
  const { id: itemId } = req.params;
  const { uomId, factor } = req.body;
  try {
    const [altUom] = await req.tenantClient
      .insert(schema.itemAlternativeUoms)
      .values({ id: crypto.randomUUID(), itemId, uomId, factor: factor.toString() })
      .returning();
    res.json(altUom);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:itemId/uoms/:id', async (req: any, res) => {
  const { id } = req.params;
  try {
    await req.tenantClient
      .delete(schema.itemAlternativeUoms)
      .where(eq(schema.itemAlternativeUoms.id, id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
