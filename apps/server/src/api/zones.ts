import { Router } from 'express';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

const router = Router();

/**
 * GET /api/zones
 */
router.get('/', async (req: any, res) => {
  try {
    const { warehouseId } = req.query;
    let query = req.tenantClient.select().from(schema.warehouseZones);
    
    if (warehouseId) {
      query = query.where(eq(schema.warehouseZones.warehouseId, warehouseId));
    }
    
    const results = await query;
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/zones
 */
router.post('/', async (req: any, res) => {
  try {
    const [zone] = await req.tenantClient.insert(schema.warehouseZones)
      .values({ 
        ...req.body,
        id: crypto.randomUUID()
      })
      .returning();
    res.json(zone);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/zones/:id
 */
router.patch('/:id', async (req: any, res) => {
  const { id } = req.params;
  try {
    const [zone] = await req.tenantClient.update(schema.warehouseZones)
      .set(req.body)
      .where(eq(schema.warehouseZones.id, id))
      .returning();
    res.json(zone);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/zones/:id
 */
router.delete('/:id', async (req: any, res) => {
  const { id } = req.params;
  try {
    await req.tenantClient.delete(schema.warehouseZones).where(eq(schema.warehouseZones.id, id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
