import { Router } from 'express';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { logAudit } from '../utils/audit';

const router = Router();

/**
 * GET /api/uom
 */
router.get('/', async (req: any, res) => {
  try {
    const results = await req.tenantClient.select().from(schema.unitsOfMeasure);
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/uom
 */
router.post('/', async (req: any, res) => {
  console.log('[UoM] Request Body:', JSON.stringify(req.body));
  
  // Normalizar: si viene un array, cogemos el primer elemento
  const body = Array.isArray(req.body) ? req.body[0] : req.body;

  // Mapeo flexible y robusto: capturamos tanto 'code' como 'symbol'
  const code = (body.code || body.symbol || '').toString().trim();
  const name = (body.name || '').toString().trim();
  const baseValue = body.baseValue || '1.0000';
  const baseUomId = body.baseUomId || null;

  if (!code || !name) {
    console.log('[UoM] Validation FAILED - Detail:', { 
      receivedCode: body.code, 
      receivedSymbol: body.symbol,
      receivedName: body.name,
      processedCode: code,
      processedName: name 
    });
    return res.status(400).json({ error: 'Faltan campos obligatorios: Código (ej: KG) y Nombre son requeridos.' });
  }

  try {
    const id = crypto.randomUUID();
    const [uom] = await req.tenantClient.insert(schema.unitsOfMeasure)
      .values({ ...body, code, name, baseValue: baseValue.toString(), baseUomId, id })
      .returning();
    res.json(uom);
    logAudit({ tenantClient: req.tenantClient, tenantId: req.tenantId || '', userId: req.user?.id, entityType: 'UnitOfMeasure', entityId: id, action: 'CREATE', newValue: uom });
  } catch (error: any) {
    console.error('[UoM] Error creating:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/uom/:id
 */
router.patch('/:id', async (req: any, res) => {
  const { id } = req.params;
  try {
    const [old] = await req.tenantClient.select().from(schema.unitsOfMeasure).where(eq(schema.unitsOfMeasure.id, id));
    const [uom] = await req.tenantClient.update(schema.unitsOfMeasure)
      .set(req.body)
      .where(eq(schema.unitsOfMeasure.id, id))
      .returning();
    res.json(uom);
    logAudit({ tenantClient: req.tenantClient, tenantId: req.tenantId || '', userId: req.user?.id, entityType: 'UnitOfMeasure', entityId: id, action: 'UPDATE', oldValue: old, newValue: uom });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/uom/:id
 */
router.delete('/:id', async (req: any, res) => {
  const { id } = req.params;
  try {
    const [old] = await req.tenantClient.select().from(schema.unitsOfMeasure).where(eq(schema.unitsOfMeasure.id, id));
    await req.tenantClient.delete(schema.unitsOfMeasure).where(eq(schema.unitsOfMeasure.id, id));
    res.json({ success: true });
    if (old) logAudit({ tenantClient: req.tenantClient, tenantId: req.tenantId || '', userId: req.user?.id, entityType: 'UnitOfMeasure', entityId: id, action: 'DELETE', oldValue: old });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
