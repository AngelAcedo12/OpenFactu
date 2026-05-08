import { Router } from 'express';
import { eq, asc } from 'drizzle-orm';
import * as schema from '../../db/schema';
import crypto from 'crypto';

const router = Router();

router.get('/', async (req: any, res) => {
  try {
    const rows = await req.tenantClient
      .select()
      .from(schema.timeclockKiosks)
      .orderBy(asc(schema.timeclockKiosks.name));
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req: any, res) => {
  try {
    const { name, location } = req.body;
    if (!name) return res.status(400).json({ error: 'name obligatorio' });
    const id = crypto.randomUUID();
    const token = crypto.randomBytes(24).toString('hex');
    const [row] = await req.tenantClient
      .insert(schema.timeclockKiosks)
      .values({
        id,
        name,
        location: location || null,
        token,
        isActive: true,
      })
      .returning();
    res.json(row);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', async (req: any, res) => {
  try {
    const allow = ['name', 'location', 'isActive'];
    const patch: Record<string, any> = {};
    for (const k of allow) if (k in req.body) patch[k] = req.body[k];
    const [row] = await req.tenantClient
      .update(schema.timeclockKiosks)
      .set(patch)
      .where(eq(schema.timeclockKiosks.id, req.params.id))
      .returning();
    if (!row) return res.status(404).json({ error: 'No encontrado' });
    res.json(row);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/regenerate-token', async (req: any, res) => {
  try {
    const token = crypto.randomBytes(24).toString('hex');
    const [row] = await req.tenantClient
      .update(schema.timeclockKiosks)
      .set({ token })
      .where(eq(schema.timeclockKiosks.id, req.params.id))
      .returning();
    if (!row) return res.status(404).json({ error: 'No encontrado' });
    res.json(row);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req: any, res) => {
  try {
    await req.tenantClient
      .delete(schema.timeclockKiosks)
      .where(eq(schema.timeclockKiosks.id, req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
