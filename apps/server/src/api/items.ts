import { Router } from 'express';
import * as schema from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import crypto from 'crypto';

const router = Router();

/**
 * GET /api/items
 */
router.get('/', async (req: any, res) => {
  try {
    const results = await req.tenantClient.select()
      .from(schema.items)
      .orderBy(desc(schema.items.createdAt));
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/items
 */
router.post('/', async (req: any, res) => {
  const { code, name, uomId, basePrice } = req.body;
  
  // Validación básica
  if (!code || !name || !uomId) {
    return res.status(400).json({ error: 'Faltan campos obligatorios: Código, Nombre y Unidad de Medida son requeridos.' });
  }

  try {
    const [item] = await req.tenantClient.insert(schema.items)
      .values({
        ...req.body,
        id: crypto.randomUUID(),
        basePrice: (basePrice ?? 0).toString() // Asegurar valor para el decimal
      })
      .returning();
    res.json(item);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/items/:id
 */
router.patch('/:id', async (req: any, res) => {
  const { id } = req.params;
  try {
    const [item] = await req.tenantClient.update(schema.items)
      .set({
        ...req.body,
        updatedAt: new Date()
      })
      .where(eq(schema.items.id, id))
      .returning();
    res.json(item);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/items/:id
 */
router.delete('/:id', async (req: any, res) => {
  const { id } = req.params;
  try {
    await req.tenantClient.delete(schema.items)
      .where(eq(schema.items.id, id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
