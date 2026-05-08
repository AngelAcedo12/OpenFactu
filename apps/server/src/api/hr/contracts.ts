import { Router } from 'express';
import { and, eq, asc, desc } from 'drizzle-orm';
import * as schema from '../../db/schema';
import crypto from 'crypto';

const router = Router();

const ALLOWED = [
  'employeeId',
  'positionId',
  'type',
  'startDate',
  'endDate',
  'grossSalary',
  'paymentsPerYear',
  'workHoursPerWeek',
  'collectiveAgreement',
  'isActive',
];

function coerce(body: any) {
  const out: any = {};
  for (const k of ALLOWED) if (k in body) out[k] = body[k] === '' ? null : body[k];
  return out;
}

router.get('/', async (req: any, res) => {
  try {
    const { employeeId, activeOnly } = req.query;
    const conds: any[] = [];
    if (employeeId) conds.push(eq(schema.contracts.employeeId, String(employeeId)));
    if (activeOnly === 'true') conds.push(eq(schema.contracts.isActive, true));
    const rows = await req.tenantClient
      .select()
      .from(schema.contracts)
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(schema.contracts.startDate));
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req: any, res) => {
  try {
    const [row] = await req.tenantClient
      .select()
      .from(schema.contracts)
      .where(eq(schema.contracts.id, req.params.id));
    if (!row) return res.status(404).json({ error: 'Contrato no encontrado' });
    res.json(row);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req: any, res) => {
  try {
    const payload = coerce(req.body);
    if (!payload.employeeId || !payload.startDate) {
      return res.status(400).json({ error: 'employeeId y startDate son obligatorios' });
    }
    const id = crypto.randomUUID();
    const [row] = await req.tenantClient
      .insert(schema.contracts)
      .values({ id, ...payload })
      .returning();
    res.json(row);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', async (req: any, res) => {
  try {
    const patch = coerce(req.body);
    const [row] = await req.tenantClient
      .update(schema.contracts)
      .set(patch)
      .where(eq(schema.contracts.id, req.params.id))
      .returning();
    if (!row) return res.status(404).json({ error: 'Contrato no encontrado' });
    res.json(row);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req: any, res) => {
  try {
    await req.tenantClient.delete(schema.contracts).where(eq(schema.contracts.id, req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
