import { Router } from 'express';
import { eq, asc } from 'drizzle-orm';
import * as schema from '../db/schema';
import crypto from 'crypto';

const router = Router();

router.get('/', async (req: any, res) => {
  try {
    const series = await req.tenantClient.select()
      .from(schema.documentSeries)
      .orderBy(asc(schema.documentSeries.name));
    res.json(series);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req: any, res) => {
  try {
    const { firstNumber, lastNumber, nextNumber, ...rest } = req.body;
    const f = Number(firstNumber);
    const l = Number(lastNumber);
    const n = Number(nextNumber);

    if (f > l) {
      return res.status(400).json({ error: 'El número de inicio no puede ser mayor al límite final (firstNumber > lastNumber).' });
    }
    if (n < f || n > l + 1) {
      return res.status(400).json({ error: 'El siguiente número asignado está fuera de rango.' });
    }

    const id = crypto.randomUUID();
    const [series] = await req.tenantClient.insert(schema.documentSeries)
      .values({ ...rest, firstNumber: f, lastNumber: l, nextNumber: n, id })
      .returning();
    res.json(series);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id', async (req: any, res) => {
  const { id } = req.params;
  try {
    const { firstNumber, lastNumber, nextNumber, ...rest } = req.body;
    const payload: any = { ...rest };
    
    if (firstNumber !== undefined && lastNumber !== undefined) {
      if (Number(firstNumber) > Number(lastNumber)) {
        return res.status(400).json({ error: 'Rango incoherente: inicio mayor que fin.' });
      }
      payload.firstNumber = Number(firstNumber);
      payload.lastNumber = Number(lastNumber);
    }
    if (nextNumber !== undefined) payload.nextNumber = Number(nextNumber);

    const [series] = await req.tenantClient.update(schema.documentSeries)
      .set(payload)
      .where(eq(schema.documentSeries.id, id))
      .returning();
    res.json(series);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req: any, res) => {
  const { id } = req.params;
  try {
    await req.tenantClient.delete(schema.documentSeries)
      .where(eq(schema.documentSeries.id, id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
