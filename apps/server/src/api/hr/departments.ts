import { Router } from 'express';
import { eq, asc, desc, like } from 'drizzle-orm';
import * as schema from '../../db/schema';
import crypto from 'crypto';
import { logAudit } from '../../utils/audit';

const router = Router();

const FIELDS = ['code', 'name', 'parentId', 'managerEmployeeId', 'costCenterId', 'isActive'];

async function nextDepartmentCode(tenantClient: any): Promise<string> {
  const rows = await tenantClient
    .select({ code: schema.departments.code })
    .from(schema.departments)
    .where(like(schema.departments.code, 'DEP-%'))
    .orderBy(desc(schema.departments.code))
    .limit(1);
  let max = 0;
  const last = rows[0]?.code as string | undefined;
  if (last) {
    const n = parseInt(last.split('-')[1] || '0', 10);
    if (!Number.isNaN(n)) max = n;
  }
  return `DEP-${String(max + 1).padStart(4, '0')}`;
}

router.get('/', async (req: any, res) => {
  const rows = await req.tenantClient
    .select()
    .from(schema.departments)
    .orderBy(asc(schema.departments.code));
  res.json(rows);
});

router.post('/', async (req: any, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name es obligatorio' });
    const id = crypto.randomUUID();
    const payload: any = { id, isActive: true };
    for (const k of FIELDS) if (k in req.body) payload[k] = req.body[k] === '' ? null : req.body[k];
    if (!payload.code) payload.code = await nextDepartmentCode(req.tenantClient);
    const [row] = await req.tenantClient.insert(schema.departments).values(payload).returning();
    res.json(row);
    logAudit({
      tenantClient: req.tenantClient,
      tenantId: req.tenantId || '',
      userId: req.user?.id,
      entityType: 'Department',
      entityId: id,
      action: 'CREATE',
      newValue: row,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', async (req: any, res) => {
  try {
    const payload: any = { updatedAt: new Date() };
    for (const k of FIELDS) if (k in req.body) payload[k] = req.body[k] === '' ? null : req.body[k];
    const [row] = await req.tenantClient
      .update(schema.departments)
      .set(payload)
      .where(eq(schema.departments.id, req.params.id))
      .returning();
    res.json(row);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req: any, res) => {
  try {
    await req.tenantClient
      .delete(schema.departments)
      .where(eq(schema.departments.id, req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
