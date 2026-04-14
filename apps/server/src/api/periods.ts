import { Router } from 'express';
import { eq, asc } from 'drizzle-orm';
import * as schema from '../db/schema';
import crypto from 'crypto';

const router = Router();

router.get('/', async (req: any, res) => {
  try {
    const periods = await req.tenantClient.select()
      .from(schema.accountingPeriods)
      .orderBy(asc(schema.accountingPeriods.code));
    res.json(periods);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req: any, res) => {
  try {
    const id = crypto.randomUUID();
    const payload = { ...req.body };
    if (payload.startDate) payload.startDate = new Date(payload.startDate);
    if (payload.endDate) payload.endDate = new Date(payload.endDate);
    
    const [period] = await req.tenantClient.insert(schema.accountingPeriods)
      .values({ ...payload, id })
      .returning();
    res.json(period);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id', async (req: any, res) => {
  const { id } = req.params;
  try {
    const payload = { ...req.body };
    if (payload.startDate) payload.startDate = new Date(payload.startDate);
    if (payload.endDate) payload.endDate = new Date(payload.endDate);

    const [period] = await req.tenantClient.update(schema.accountingPeriods)
      .set(payload)
      .where(eq(schema.accountingPeriods.id, id))
      .returning();
    res.json(period);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req: any, res) => {
  const { id } = req.params;
  try {
    await req.tenantClient.delete(schema.accountingPeriods)
      .where(eq(schema.accountingPeriods.id, id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
