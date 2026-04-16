import { Router } from 'express';
import { eq, asc } from 'drizzle-orm';
import * as schema from '../db/schema';
import crypto from 'crypto';
import { logAudit } from '../utils/audit';

const router = Router();

router.get('/', async (req: any, res) => {
  try {
    const groups = await req.tenantClient
      .select()
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
    const [group] = await req.tenantClient
      .insert(schema.partnerGroups)
      .values({ ...req.body, id })
      .returning();
    res.json(group);
    logAudit({
      tenantClient: req.tenantClient,
      tenantId: req.tenantId || '',
      userId: req.user?.id,
      entityType: 'PartnerGroup',
      entityId: id,
      action: 'CREATE',
      newValue: group,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id', async (req: any, res) => {
  const { id } = req.params;
  try {
    const [old] = await req.tenantClient
      .select()
      .from(schema.partnerGroups)
      .where(eq(schema.partnerGroups.id, id));
    const [group] = await req.tenantClient
      .update(schema.partnerGroups)
      .set(req.body)
      .where(eq(schema.partnerGroups.id, id))
      .returning();
    res.json(group);
    logAudit({
      tenantClient: req.tenantClient,
      tenantId: req.tenantId || '',
      userId: req.user?.id,
      entityType: 'PartnerGroup',
      entityId: id,
      action: 'UPDATE',
      oldValue: old,
      newValue: group,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req: any, res) => {
  const { id } = req.params;
  try {
    const [old] = await req.tenantClient
      .select()
      .from(schema.partnerGroups)
      .where(eq(schema.partnerGroups.id, id));
    await req.tenantClient.delete(schema.partnerGroups).where(eq(schema.partnerGroups.id, id));
    res.json({ success: true });
    if (old)
      logAudit({
        tenantClient: req.tenantClient,
        tenantId: req.tenantId || '',
        userId: req.user?.id,
        entityType: 'PartnerGroup',
        entityId: id,
        action: 'DELETE',
        oldValue: old,
      });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
