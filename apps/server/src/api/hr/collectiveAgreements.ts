import { Router } from 'express';
import { eq, asc } from 'drizzle-orm';
import * as schema from '../../db/schema';
import crypto from 'crypto';

const router = Router();

const ALLOWED = [
  'code',
  'name',
  'sector',
  'validFrom',
  'validTo',
  'baseSalary',
  'vacationDays',
  'weeklyHours',
  'documentUrl',
  'notes',
  'isActive',
];

function coerce(body: any) {
  const out: any = {};
  for (const k of ALLOWED) if (k in body) out[k] = body[k] === '' ? null : body[k];
  return out;
}

router.get('/', async (req: any, res) => {
  try {
    const rows = await req.tenantClient
      .select()
      .from(schema.collectiveAgreements)
      .orderBy(asc(schema.collectiveAgreements.code));
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req: any, res) => {
  try {
    const [row] = await req.tenantClient
      .select()
      .from(schema.collectiveAgreements)
      .where(eq(schema.collectiveAgreements.id, req.params.id));
    if (!row) return res.status(404).json({ error: 'Convenio no encontrado' });
    res.json(row);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req: any, res) => {
  try {
    const payload = coerce(req.body);
    if (!payload.code || !payload.name) {
      return res.status(400).json({ error: 'code y name son obligatorios' });
    }
    const id = crypto.randomUUID();
    const [row] = await req.tenantClient
      .insert(schema.collectiveAgreements)
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
      .update(schema.collectiveAgreements)
      .set(patch)
      .where(eq(schema.collectiveAgreements.id, req.params.id))
      .returning();
    if (!row) return res.status(404).json({ error: 'Convenio no encontrado' });
    res.json(row);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req: any, res) => {
  try {
    await req.tenantClient
      .delete(schema.collectiveAgreements)
      .where(eq(schema.collectiveAgreements.id, req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
