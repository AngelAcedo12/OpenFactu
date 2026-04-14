import { Router } from 'express';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema';
import crypto from 'crypto';

const router = Router();

// GET all tax groups
router.get('/', async (req: any, res) => {
  try {
    const results = await req.tenantClient.select().from(schema.taxGroups);
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET single tax group
router.get('/:id', async (req: any, res) => {
  try {
    const [taxGroup] = await req.tenantClient.select()
      .from(schema.taxGroups)
      .where(eq(schema.taxGroups.id, req.params.id));
    
    if (!taxGroup) return res.status(404).json({ error: 'Grupo de impuestos no encontrado' });
    res.json(taxGroup);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST new tax group
router.post('/', async (req: any, res) => {
  const { code, rate } = req.body;
  try {
    const [inserted] = await req.tenantClient.insert(schema.taxGroups)
      .values({
        id: crypto.randomUUID(),
        code,
        rate: String(rate)
      })
      .returning();
    res.json(inserted);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH update tax group
router.patch('/:id', async (req: any, res) => {
  const { code, rate } = req.body;
  try {
    const [updated] = await req.tenantClient.update(schema.taxGroups)
      .set({
        ...(code && { code }),
        ...(rate && { rate: String(rate) })
      })
      .where(eq(schema.taxGroups.id, req.params.id))
      .returning();
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE tax group
router.delete('/:id', async (req: any, res) => {
  try {
    await req.tenantClient.delete(schema.taxGroups)
      .where(eq(schema.taxGroups.id, req.params.id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
