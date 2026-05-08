import { Router } from 'express';
import { eq, asc, desc, like } from 'drizzle-orm';
import * as schema from '../db/schema';
import crypto from 'crypto';
import { logAudit } from '../utils/audit';

const router = Router();

async function nextCode(tenantClient: any): Promise<string> {
  const rows = await tenantClient
    .select({ code: schema.profitCenters.code })
    .from(schema.profitCenters)
    .where(like(schema.profitCenters.code, 'PC-%'))
    .orderBy(desc(schema.profitCenters.code))
    .limit(1);
  let max = 0;
  const last = rows[0]?.code as string | undefined;
  if (last) {
    const n = parseInt(last.split('-')[1] || '0', 10);
    if (!Number.isNaN(n)) max = n;
  }
  return `PC-${String(max + 1).padStart(4, '0')}`;
}

router.get('/', async (req: any, res) => {
  try {
    const rows = await req.tenantClient
      .select()
      .from(schema.profitCenters)
      .orderBy(asc(schema.profitCenters.code));
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req: any, res) => {
  try {
    const { code, name, parentId, managerEmployeeId, isActive, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'name es obligatorio' });
    const finalCode = code || (await nextCode(req.tenantClient));
    const id = crypto.randomUUID();
    const [row] = await req.tenantClient
      .insert(schema.profitCenters)
      .values({
        id,
        code: finalCode,
        name,
        parentId: parentId || null,
        managerEmployeeId: managerEmployeeId || null,
        isActive: isActive !== false,
        notes: notes || null,
      })
      .returning();
    res.json(row);
    logAudit({
      tenantClient: req.tenantClient,
      tenantId: req.tenantId || '',
      userId: req.user?.id,
      entityType: 'ProfitCenter',
      entityId: id,
      action: 'CREATE',
      newValue: row,
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
      .from(schema.profitCenters)
      .where(eq(schema.profitCenters.id, id));
    if (!old) return res.status(404).json({ error: 'Centro de beneficio no encontrado' });
    const payload: any = {};
    for (const k of ['code', 'name', 'parentId', 'managerEmployeeId', 'isActive', 'notes']) {
      if (k in req.body) payload[k] = req.body[k] === '' ? null : req.body[k];
    }
    payload.updatedAt = new Date();
    const [row] = await req.tenantClient
      .update(schema.profitCenters)
      .set(payload)
      .where(eq(schema.profitCenters.id, id))
      .returning();
    res.json(row);
    logAudit({
      tenantClient: req.tenantClient,
      tenantId: req.tenantId || '',
      userId: req.user?.id,
      entityType: 'ProfitCenter',
      entityId: id,
      action: 'UPDATE',
      oldValue: old,
      newValue: row,
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
      .from(schema.profitCenters)
      .where(eq(schema.profitCenters.id, id));
    await req.tenantClient.delete(schema.profitCenters).where(eq(schema.profitCenters.id, id));
    res.json({ success: true });
    if (old)
      logAudit({
        tenantClient: req.tenantClient,
        tenantId: req.tenantId || '',
        userId: req.user?.id,
        entityType: 'ProfitCenter',
        entityId: id,
        action: 'DELETE',
        oldValue: old,
      });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
