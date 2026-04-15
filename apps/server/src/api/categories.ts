import { Router } from 'express';
import * as schema from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import crypto from 'crypto';
import { logAudit } from '../utils/audit';

const router = Router();

/**
 * GET /api/categories
 */
router.get('/', async (req: any, res) => {
  try {
    const results = await req.tenantClient.select().from(schema.categories).orderBy(desc(schema.categories.name));
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/categories
 */
router.post('/', async (req: any, res) => {
  try {
    const id = crypto.randomUUID();
    const [category] = await req.tenantClient.insert(schema.categories)
      .values({ ...req.body, id })
      .returning();
    res.json(category);
    logAudit({ tenantClient: req.tenantClient, tenantId: req.tenantId || '', userId: req.user?.id, entityType: 'Category', entityId: id, action: 'CREATE', newValue: category });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/categories/:id
 */
router.patch('/:id', async (req: any, res) => {
  const { id } = req.params;
  try {
    const [old] = await req.tenantClient.select().from(schema.categories).where(eq(schema.categories.id, id));
    const [category] = await req.tenantClient.update(schema.categories)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(schema.categories.id, id))
      .returning();
    res.json(category);
    logAudit({ tenantClient: req.tenantClient, tenantId: req.tenantId || '', userId: req.user?.id, entityType: 'Category', entityId: id, action: 'UPDATE', oldValue: old, newValue: category });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/categories/:id
 */
router.delete('/:id', async (req: any, res) => {
  const { id } = req.params;
  try {
    const [old] = await req.tenantClient.select().from(schema.categories).where(eq(schema.categories.id, id));
    await req.tenantClient.delete(schema.categories).where(eq(schema.categories.id, id));
    res.json({ success: true });
    if (old) logAudit({ tenantClient: req.tenantClient, tenantId: req.tenantId || '', userId: req.user?.id, entityType: 'Category', entityId: id, action: 'DELETE', oldValue: old });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
