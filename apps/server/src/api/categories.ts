import { Router } from 'express';
import * as schema from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import crypto from 'crypto';

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
    const [category] = await req.tenantClient.insert(schema.categories)
      .values({ 
        ...req.body,
        id: crypto.randomUUID()
      })
      .returning();
    res.json(category);
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
    const [category] = await req.tenantClient.update(schema.categories)
      .set({
        ...req.body,
        updatedAt: new Date()
      })
      .where(eq(schema.categories.id, id))
      .returning();
    res.json(category);
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
    await req.tenantClient.delete(schema.categories).where(eq(schema.categories.id, id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
