import { Router } from 'express';
import { eq, asc, desc, like } from 'drizzle-orm';
import * as schema from '../db/schema';
import crypto from 'crypto';
import { logAudit } from '../utils/audit';

const router = Router();

async function nextCode(tenantClient: any): Promise<string> {
  const rows = await tenantClient
    .select({ code: schema.internalOrders.code })
    .from(schema.internalOrders)
    .where(like(schema.internalOrders.code, 'PRJ-%'))
    .orderBy(desc(schema.internalOrders.code))
    .limit(1);
  let max = 0;
  const last = rows[0]?.code as string | undefined;
  if (last) {
    const n = parseInt(last.split('-')[1] || '0', 10);
    if (!Number.isNaN(n)) max = n;
  }
  return `PRJ-${String(max + 1).padStart(4, '0')}`;
}

const ALLOWED_TYPES = new Set(['project', 'internal_order', 'wbs']);
const ALLOWED_STATUS = new Set(['open', 'closed']);

function coerce(body: any) {
  const out: any = {};
  for (const k of [
    'code',
    'name',
    'type',
    'startDate',
    'endDate',
    'budgetAmount',
    'status',
    'costCenterId',
    'notes',
  ]) {
    if (k in body) out[k] = body[k] === '' ? null : body[k];
  }
  return out;
}

router.get('/', async (req: any, res) => {
  try {
    const rows = await req.tenantClient
      .select()
      .from(schema.internalOrders)
      .orderBy(asc(schema.internalOrders.code));
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req: any, res) => {
  try {
    const payload = coerce(req.body);
    if (!payload.name) {
      return res.status(400).json({ error: 'name es obligatorio' });
    }
    if (!payload.code) payload.code = await nextCode(req.tenantClient);
    if (payload.type && !ALLOWED_TYPES.has(payload.type)) {
      return res.status(400).json({ error: 'type inválido' });
    }
    if (payload.status && !ALLOWED_STATUS.has(payload.status)) {
      return res.status(400).json({ error: 'status inválido' });
    }
    const id = crypto.randomUUID();
    const [row] = await req.tenantClient
      .insert(schema.internalOrders)
      .values({ id, ...payload })
      .returning();
    res.json(row);
    logAudit({
      tenantClient: req.tenantClient,
      tenantId: req.tenantId || '',
      userId: req.user?.id,
      entityType: 'InternalOrder',
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
      .from(schema.internalOrders)
      .where(eq(schema.internalOrders.id, id));
    if (!old) return res.status(404).json({ error: 'Orden interna no encontrada' });
    const payload: any = coerce(req.body);
    if (payload.type && !ALLOWED_TYPES.has(payload.type)) {
      return res.status(400).json({ error: 'type inválido' });
    }
    if (payload.status && !ALLOWED_STATUS.has(payload.status)) {
      return res.status(400).json({ error: 'status inválido' });
    }
    payload.updatedAt = new Date();
    const [row] = await req.tenantClient
      .update(schema.internalOrders)
      .set(payload)
      .where(eq(schema.internalOrders.id, id))
      .returning();
    res.json(row);
    logAudit({
      tenantClient: req.tenantClient,
      tenantId: req.tenantId || '',
      userId: req.user?.id,
      entityType: 'InternalOrder',
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
      .from(schema.internalOrders)
      .where(eq(schema.internalOrders.id, id));
    await req.tenantClient.delete(schema.internalOrders).where(eq(schema.internalOrders.id, id));
    res.json({ success: true });
    if (old)
      logAudit({
        tenantClient: req.tenantClient,
        tenantId: req.tenantId || '',
        userId: req.user?.id,
        entityType: 'InternalOrder',
        entityId: id,
        action: 'DELETE',
        oldValue: old,
      });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
