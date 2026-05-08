import { Router } from 'express';
import { eq, asc } from 'drizzle-orm';
import * as schema from '../../db/schema';
import crypto from 'crypto';

const router = Router();

router.get('/', async (req: any, res) => {
  try {
    const rows = await req.tenantClient
      .select()
      .from(schema.shiftTemplates)
      .orderBy(asc(schema.shiftTemplates.code));
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req: any, res) => {
  try {
    const { code, name, startTime, endTime } = req.body;
    if (!code || !name || !startTime || !endTime)
      return res.status(400).json({ error: 'code, name, startTime y endTime son obligatorios' });
    const id = crypto.randomUUID();
    const [row] = await req.tenantClient
      .insert(schema.shiftTemplates)
      .values({
        id,
        code,
        name,
        startTime,
        endTime,
        breakMinutes: req.body.breakMinutes ?? 0,
        secondStartTime: req.body.secondStartTime || null,
        secondEndTime: req.body.secondEndTime || null,
        color: req.body.color || null,
        isActive: req.body.isActive ?? true,
      })
      .returning();
    res.json(row);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', async (req: any, res) => {
  try {
    const allow = [
      'code',
      'name',
      'startTime',
      'endTime',
      'breakMinutes',
      'secondStartTime',
      'secondEndTime',
      'color',
      'isActive',
    ];
    const patch: Record<string, any> = {};
    for (const k of allow) if (k in req.body) patch[k] = req.body[k];
    const [row] = await req.tenantClient
      .update(schema.shiftTemplates)
      .set(patch)
      .where(eq(schema.shiftTemplates.id, req.params.id))
      .returning();
    if (!row) return res.status(404).json({ error: 'No encontrado' });
    res.json(row);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req: any, res) => {
  try {
    const [row] = await req.tenantClient
      .update(schema.shiftTemplates)
      .set({ isActive: false })
      .where(eq(schema.shiftTemplates.id, req.params.id))
      .returning();
    if (!row) return res.status(404).json({ error: 'No encontrado' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
