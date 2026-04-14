import { Router } from 'express';
import { eq, asc } from 'drizzle-orm';
import * as schema from '../db/schema';
import crypto from 'crypto';

const router = Router();

router.get('/', async (req: any, res) => {
  try {
    const groups = await req.tenantClient.select()
      .from(schema.partnerGroups)
      .orderBy(asc(schema.partnerGroups.name));
    res.json(groups);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req: any, res) => {
  try {
    const id = crypto.randomUUID();
    const [group] = await req.tenantClient.insert(schema.partnerGroups)
      .values({ ...req.body, id })
      .returning();
    res.json(group);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id', async (req: any, res) => {
  const { id } = req.params;
  try {
    const [group] = await req.tenantClient.update(schema.partnerGroups)
      .set(req.body)
      .where(eq(schema.partnerGroups.id, id))
      .returning();
    res.json(group);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req: any, res) => {
  const { id } = req.params;
  try {
    await req.tenantClient.delete(schema.partnerGroups)
      .where(eq(schema.partnerGroups.id, id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
