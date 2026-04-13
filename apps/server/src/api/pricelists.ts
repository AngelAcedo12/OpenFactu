import { Router } from 'express';
import * as schema from '../db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

const router = Router();

/**
 * GET /api/pricelists
 */
router.get('/', async (req: any, res) => {
  try {
    const results = await req.tenantClient.select().from(schema.priceLists);
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/pricelists
 */
router.post('/', async (req: any, res) => {
  try {
    const [priceList] = await req.tenantClient.insert(schema.priceLists)
      .values({ 
        ...req.body,
        id: crypto.randomUUID()
      })
      .returning();
    res.json(priceList);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/pricelists/:id
 */
router.patch('/:id', async (req: any, res) => {
  const { id } = req.params;
  try {
    const [priceList] = await req.tenantClient.update(schema.priceLists)
      .set(req.body)
      .where(eq(schema.priceLists.id, id))
      .returning();
    res.json(priceList);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/pricelists/:id
 */
router.delete('/:id', async (req: any, res) => {
  const { id } = req.params;
  try {
    await req.tenantClient.delete(schema.priceLists).where(eq(schema.priceLists.id, id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/pricelists/:id/prices
 * Obtiene todos los precios de artículos específicos para esta lista.
 */
router.get('/:id/prices', async (req: any, res) => {
  const { id } = req.params;
  try {
    const results = await req.tenantClient.select().from(schema.itemPrices).where(eq(schema.itemPrices.priceListId, id));
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/pricelists/:id/prices
 * Asigna o actualiza un precio para un artículo en esta lista.
 */
router.post('/:id/prices', async (req: any, res) => {
  const { id: priceListId } = req.params;
  const { itemId, price } = req.body;

  try {
    // 1. Verificar si ya existe para hacer upsert manual
    const [existing] = await req.tenantClient.select()
      .from(schema.itemPrices)
      .where(and(
        eq(schema.itemPrices.priceListId, priceListId),
        eq(schema.itemPrices.itemId, itemId)
      ));

    if (existing) {
      const [updated] = await req.tenantClient.update(schema.itemPrices)
        .set({ price: price.toString() })
        .where(eq(schema.itemPrices.id, existing.id))
        .returning();
      return res.json(updated);
    }

    const [created] = await req.tenantClient.insert(schema.itemPrices)
      .values({
        id: crypto.randomUUID(),
        priceListId,
        itemId,
        price: price.toString()
      })
      .returning();
    res.json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
