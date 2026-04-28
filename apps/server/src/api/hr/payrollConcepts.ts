import { Router } from 'express';
import { and, eq, asc } from 'drizzle-orm';
import * as schema from '../../db/schema';
import crypto from 'crypto';
import { logAudit } from '../../utils/audit';

const router = Router();

const VALID_KIND = new Set(['devengo', 'deduccion', 'aportacion_empresa']);
const VALID_CALC = new Set(['fixed', 'percent_of_base', 'per_hour']);

/** GET /api/hr/payroll-concepts?activeOnly=true&kind= */
router.get('/', async (req: any, res) => {
  try {
    const { activeOnly, kind } = req.query;
    const conds: any[] = [];
    if (activeOnly === 'true') conds.push(eq(schema.payrollConcepts.isActive, true));
    if (kind) conds.push(eq(schema.payrollConcepts.kind, String(kind)));
    const rows = await req.tenantClient
      .select()
      .from(schema.payrollConcepts)
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(asc(schema.payrollConcepts.code));
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req: any, res) => {
  try {
    const [row] = await req.tenantClient
      .select()
      .from(schema.payrollConcepts)
      .where(eq(schema.payrollConcepts.id, req.params.id));
    if (!row) return res.status(404).json({ error: 'Concepto no encontrado' });
    res.json(row);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req: any, res) => {
  try {
    const {
      code,
      name,
      kind,
      taxableIrpf,
      taxableSs,
      calculation,
      defaultAmount,
      defaultPercent,
      accountId,
      isActive,
    } = req.body;
    if (!code || !name || !kind) {
      return res.status(400).json({ error: 'code, name y kind son obligatorios' });
    }
    if (!VALID_KIND.has(kind)) {
      return res.status(400).json({ error: `kind inválido: ${kind}` });
    }
    if (calculation && !VALID_CALC.has(calculation)) {
      return res.status(400).json({ error: `calculation inválido: ${calculation}` });
    }
    const id = crypto.randomUUID();
    const [row] = await req.tenantClient
      .insert(schema.payrollConcepts)
      .values({
        id,
        code,
        name,
        kind,
        taxableIrpf: taxableIrpf ?? true,
        taxableSs: taxableSs ?? true,
        calculation: calculation || 'fixed',
        defaultAmount: defaultAmount != null ? String(defaultAmount) : null,
        defaultPercent: defaultPercent != null ? String(defaultPercent) : null,
        accountId: accountId || null,
        isActive: isActive ?? true,
      })
      .returning();
    res.json(row);
    logAudit({
      tenantClient: req.tenantClient,
      tenantId: req.tenantId || '',
      userId: req.user?.id,
      entityType: 'PayrollConcept',
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
    const patch: Record<string, any> = {};
    const allow = [
      'code',
      'name',
      'kind',
      'taxableIrpf',
      'taxableSs',
      'calculation',
      'accountId',
      'isActive',
    ];
    for (const k of allow) if (k in req.body) patch[k] = req.body[k];
    if (patch.kind && !VALID_KIND.has(patch.kind))
      return res.status(400).json({ error: `kind inválido: ${patch.kind}` });
    if (patch.calculation && !VALID_CALC.has(patch.calculation))
      return res.status(400).json({ error: `calculation inválido: ${patch.calculation}` });
    if ('defaultAmount' in req.body)
      patch.defaultAmount = req.body.defaultAmount != null ? String(req.body.defaultAmount) : null;
    if ('defaultPercent' in req.body)
      patch.defaultPercent =
        req.body.defaultPercent != null ? String(req.body.defaultPercent) : null;
    patch.updatedAt = new Date();
    const [row] = await req.tenantClient
      .update(schema.payrollConcepts)
      .set(patch)
      .where(eq(schema.payrollConcepts.id, req.params.id))
      .returning();
    if (!row) return res.status(404).json({ error: 'Concepto no encontrado' });
    res.json(row);
    logAudit({
      tenantClient: req.tenantClient,
      tenantId: req.tenantId || '',
      userId: req.user?.id,
      entityType: 'PayrollConcept',
      entityId: req.params.id,
      action: 'UPDATE',
      newValue: row,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req: any, res) => {
  try {
    // Soft-delete: marcar inactivo. Si nunca se ha usado, se borra de verdad.
    const used = await req.tenantClient
      .select({ id: schema.payrollLines.id })
      .from(schema.payrollLines)
      .where(eq(schema.payrollLines.conceptId, req.params.id))
      .limit(1);
    if (used.length) {
      const [row] = await req.tenantClient
        .update(schema.payrollConcepts)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(schema.payrollConcepts.id, req.params.id))
        .returning();
      if (!row) return res.status(404).json({ error: 'Concepto no encontrado' });
      return res.json({ success: true, softDeleted: true });
    }
    const [row] = await req.tenantClient
      .delete(schema.payrollConcepts)
      .where(eq(schema.payrollConcepts.id, req.params.id))
      .returning();
    if (!row) return res.status(404).json({ error: 'Concepto no encontrado' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/hr/payroll-concepts/seed-defaults
 * Crea (idempotente) un catálogo estándar español: salario base, pluses
 * comunes, IRPF, SS empleado y SS empresa con porcentajes típicos. Sólo
 * inserta los códigos que aún no existen.
 */
router.post('/seed-defaults', async (req: any, res) => {
  try {
    const existing = await req.tenantClient
      .select({ code: schema.payrollConcepts.code })
      .from(schema.payrollConcepts);
    const have = new Set(existing.map((r: any) => r.code));

    const seeds = [
      // Devengos
      {
        code: 'SB',
        name: 'Salario base',
        kind: 'devengo',
        calculation: 'fixed',
        taxableIrpf: true,
        taxableSs: true,
      },
      {
        code: 'PLUS_CONV',
        name: 'Plus convenio',
        kind: 'devengo',
        calculation: 'fixed',
        taxableIrpf: true,
        taxableSs: true,
      },
      {
        code: 'PLUS_TRANSP',
        name: 'Plus transporte',
        kind: 'devengo',
        calculation: 'fixed',
        taxableIrpf: false,
        taxableSs: false,
      },
      {
        code: 'PLUS_PROD',
        name: 'Plus productividad',
        kind: 'devengo',
        calculation: 'fixed',
        taxableIrpf: true,
        taxableSs: true,
      },
      {
        code: 'DIETAS',
        name: 'Dietas',
        kind: 'devengo',
        calculation: 'fixed',
        taxableIrpf: false,
        taxableSs: false,
      },
      {
        code: 'HORAS_EXTRA',
        name: 'Horas extra',
        kind: 'devengo',
        calculation: 'per_hour',
        taxableIrpf: true,
        taxableSs: true,
      },
      // Deducciones
      {
        code: 'IRPF',
        name: 'Retención IRPF',
        kind: 'deduccion',
        calculation: 'percent_of_base',
        defaultPercent: '15',
        taxableIrpf: false,
        taxableSs: false,
      },
      {
        code: 'SS_EMP',
        name: 'Seguridad Social Empleado',
        kind: 'deduccion',
        calculation: 'percent_of_base',
        defaultPercent: '6.35',
        taxableIrpf: false,
        taxableSs: false,
      },
      {
        code: 'ANTICIPO',
        name: 'Anticipo',
        kind: 'deduccion',
        calculation: 'fixed',
        taxableIrpf: false,
        taxableSs: false,
      },
      // Aportación empresa
      {
        code: 'SS_EMPRESA',
        name: 'Seguridad Social Empresa',
        kind: 'aportacion_empresa',
        calculation: 'percent_of_base',
        defaultPercent: '29.9',
        taxableIrpf: false,
        taxableSs: false,
      },
    ];

    let created = 0;
    for (const s of seeds) {
      if (have.has(s.code)) continue;
      await req.tenantClient.insert(schema.payrollConcepts).values({
        id: crypto.randomUUID(),
        code: s.code,
        name: s.name,
        kind: s.kind,
        calculation: s.calculation,
        defaultPercent: (s as any).defaultPercent || null,
        defaultAmount: null,
        taxableIrpf: s.taxableIrpf,
        taxableSs: s.taxableSs,
        accountId: null,
        isActive: true,
      });
      created++;
    }
    res.json({ created, total: seeds.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
