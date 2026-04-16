import { Router } from 'express';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { logAudit } from '../utils/audit';

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
    const id = crypto.randomUUID();
    const [zone] = await req.tenantClient
      .insert(schema.warehouseZones)
      .values({ ...req.body, id })
      .returning();
    res.json(zone);
    logAudit({
      tenantClient: req.tenantClient,
      tenantId: req.tenantId || '',
      userId: req.user?.id,
      entityType: 'Zone',
      entityId: id,
      action: 'CREATE',
      newValue: zone,
    });
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
    const [old] = await req.tenantClient
      .select()
      .from(schema.warehouseZones)
      .where(eq(schema.warehouseZones.id, id));
    const [zone] = await req.tenantClient
      .update(schema.warehouseZones)
      .set(req.body)
      .where(eq(schema.warehouseZones.id, id))
      .returning();
    res.json(zone);
    logAudit({
      tenantClient: req.tenantClient,
      tenantId: req.tenantId || '',
      userId: req.user?.id,
      entityType: 'Zone',
      entityId: id,
      action: 'UPDATE',
      oldValue: old,
      newValue: zone,
    });
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
    const [old] = await req.tenantClient
      .select()
      .from(schema.warehouseZones)
      .where(eq(schema.warehouseZones.id, id));
    await req.tenantClient.delete(schema.warehouseZones).where(eq(schema.warehouseZones.id, id));
    res.json({ success: true });
    if (old)
      logAudit({
        tenantClient: req.tenantClient,
        tenantId: req.tenantId || '',
        userId: req.user?.id,
        entityType: 'Zone',
        entityId: id,
        action: 'DELETE',
        oldValue: old,
      });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
