import { Router } from 'express';
import * as schema from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import crypto from 'crypto';
import { logAudit } from '../utils/audit';

const router = Router();

/**
 * GET /api/warehouses
 */
router.get('/', async (req: any, res) => {
  try {
    const results = await req.tenantClient.select().from(schema.warehouses);
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/warehouses
 */
router.post('/', async (req: any, res) => {
  try {
    const { isDefault } = req.body;
    if (isDefault) await req.tenantClient.update(schema.warehouses).set({ isDefault: false });
    const id = crypto.randomUUID();
    const [warehouse] = await req.tenantClient
      .insert(schema.warehouses)
      .values({ ...req.body, id })
      .returning();
    res.json(warehouse);
    logAudit({
      tenantClient: req.tenantClient,
      tenantId: req.tenantId || '',
      userId: req.user?.id,
      entityType: 'Warehouse',
      entityId: id,
      action: 'CREATE',
      newValue: warehouse,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/warehouses/:id
 */
router.patch('/:id', async (req: any, res) => {
  const { id } = req.params;
  try {
    const { isDefault } = req.body;
    if (isDefault) await req.tenantClient.update(schema.warehouses).set({ isDefault: false });
    const [old] = await req.tenantClient
      .select()
      .from(schema.warehouses)
      .where(eq(schema.warehouses.id, id));
    const [warehouse] = await req.tenantClient
      .update(schema.warehouses)
      .set(req.body)
      .where(eq(schema.warehouses.id, id))
      .returning();
    res.json(warehouse);
    logAudit({
      tenantClient: req.tenantClient,
      tenantId: req.tenantId || '',
      userId: req.user?.id,
      entityType: 'Warehouse',
      entityId: id,
      action: 'UPDATE',
      oldValue: old,
      newValue: warehouse,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/warehouses/:id
 */
router.delete('/:id', async (req: any, res) => {
  const { id } = req.params;
  try {
    const [old] = await req.tenantClient
      .select()
      .from(schema.warehouses)
      .where(eq(schema.warehouses.id, id));
    await req.tenantClient.delete(schema.warehouses).where(eq(schema.warehouses.id, id));
    res.json({ success: true });
    if (old)
      logAudit({
        tenantClient: req.tenantClient,
        tenantId: req.tenantId || '',
        userId: req.user?.id,
        entityType: 'Warehouse',
        entityId: id,
        action: 'DELETE',
        oldValue: old,
      });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

/**
 * GENERACIÓN MASIVA DE UBICACIONES (Motor de Distribución Industrial)
 * POST /api/warehouses/:id/generate-bins
 */
router.post('/:id/generate-bins', async (req: any, res) => {
  const { id: warehouseId } = req.params;
  const {
    prefix = '',
    aisleRange, // { start: number, end: number, padding: number }
    stackRange,
    levelRange,
    separator = '-',
  } = req.body;

  try {
    // Diagnóstico de contexto
    const spResult = await req.tenantClient.execute(sql`SHOW search_path`);
    console.log(`[DEBUG_CONTEXT] Tenant Schema: ${req.tenantId}, Active Path:`, spResult.rows[0]);

    // Verificar que el almacén existe en este tenant para evitar errores de FK
    const [warehouse] = await req.tenantClient
      .select()
      .from(schema.warehouses)
      .where(eq(schema.warehouses.id, warehouseId))
      .limit(1);

    if (!warehouse) {
      res.status(404).json({ error: 'Almacén no encontrado en el contexto empresarial actual.' });
      return;
    }

    const binsToCreate: any[] = [];

    // Triple bucle para generar la malla de ubicaciones
    for (let a = aisleRange.start; a <= aisleRange.end; a++) {
      for (let s = stackRange.start; s <= stackRange.end; s++) {
        for (let l = levelRange.start; l <= levelRange.end; l++) {
          const aStr = a.toString().padStart(aisleRange.padding || 2, '0');
          const sStr = s.toString().padStart(stackRange.padding || 2, '0');
          const lStr = l.toString().padStart(levelRange.padding || 2, '0');

          const binName = `${prefix}${aStr}${separator}${sStr}${separator}${lStr}`;

          binsToCreate.push({
            id: crypto.randomUUID(),
            name: binName,
            warehouseId,
            description: `Auto-generado: Pasillo ${aStr}, Columna ${sStr}, Nivel ${lStr}`,
          });
        }
      }
    }

    // Inserción uno a uno para máxima estabilidad y control de errores individuales
    if (binsToCreate.length > 0) {
      let createdCount = 0;
      for (const bin of binsToCreate) {
        try {
          await req.tenantClient.insert(schema.warehouseZones).values(bin);
          createdCount++;
        } catch (err: any) {
          console.warn(`[GEN_BINS] Salteada ubicación ${bin.name}. Error: ${err.message}`);
        }
      }

      res.json({
        success: true,
        count: createdCount,
        message: `${createdCount} ubicaciones procesadas correctamente.`,
      });
      return;
    }

    res.json({
      success: true,
      count: binsToCreate.length,
      message: `${binsToCreate.length} ubicaciones generadas correctamente.`,
    });
  } catch (error: any) {
    console.error('[WAREHOUSE_GEN_ERROR] Failed to generate bins:', error);
    res.status(500).json({ error: error.message });
  }
});
