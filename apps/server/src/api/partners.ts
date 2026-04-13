import { Router } from 'express';
import { eq, asc } from 'drizzle-orm';
import * as schema from '../db/schema';
import crypto from 'crypto';

const router = Router();

/**
 * GET /api/partners
 * Lista todos los socios de negocio del tenant.
 */
router.get('/', async (req: any, res) => {
  try {
    const partners = await req.tenantClient.select()
      .from(schema.businessPartners)
      .orderBy(asc(schema.businessPartners.name));
    res.json(partners);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/partners
 * Crea un nuevo socio de negocio.
 */
router.post('/', async (req: any, res) => {
  try {
    const id = crypto.randomUUID();
    const [partner] = await req.tenantClient.insert(schema.businessPartners)
      .values({
        ...req.body,
        id
      })
      .returning();
    res.json(partner);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/partners/:id
 */
router.patch('/:id', async (req: any, res) => {
  const { id } = req.params;
  try {
    const [partner] = await req.tenantClient.update(schema.businessPartners)
      .set(req.body)
      .where(eq(schema.businessPartners.id, id))
      .returning();
    res.json(partner);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/partners/:id
 */
router.delete('/:id', async (req: any, res) => {
  const { id } = req.params;
  try {
    await req.tenantClient.delete(schema.businessPartners)
      .where(eq(schema.businessPartners.id, id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
