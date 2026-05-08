/**
 * CRUD de suscripciones a webhooks salientes.
 *
 *   GET    /                   — listar
 *   POST   /                   — crear
 *   PATCH  /:id                — editar
 *   DELETE /:id                — borrar
 *   POST   /:id/test           — dispara un evento dummy a la URL
 */

import { Router } from 'express';
import { desc, eq } from 'drizzle-orm';
import crypto from 'crypto';
import * as schema from '../db/schema';
import { webhookQueue } from '../core/webhooks/WebhookQueue';

const router = Router();

router.get('/', async (req: any, res) => {
  const rows = await req.tenantClient
    .select()
    .from(schema.webhookSubscriptions)
    .orderBy(desc(schema.webhookSubscriptions.createdAt));
  res.json(rows);
});

router.post('/', async (req: any, res) => {
  try {
    const body = req.body || {};
    if (!body.name || !body.url) {
      return res.status(400).json({ error: 'Nombre y URL son obligatorios' });
    }
    try {
      new URL(body.url);
    } catch {
      return res.status(400).json({ error: 'URL inválida' });
    }
    const id = crypto.randomUUID();
    await req.tenantClient.insert(schema.webhookSubscriptions).values({
      id,
      name: body.name,
      url: body.url,
      events: Array.isArray(body.events) ? body.events : [],
      secret: body.secret || null,
      isActive: body.isActive !== false,
    });
    res.json({ id });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/:id', async (req: any, res) => {
  try {
    const body = req.body || {};
    const patch: any = {};
    for (const k of ['name', 'url', 'events', 'secret', 'isActive']) {
      if (k in body) patch[k] = body[k];
    }
    patch.updatedAt = new Date();
    await req.tenantClient
      .update(schema.webhookSubscriptions)
      .set(patch)
      .where(eq(schema.webhookSubscriptions.id, req.params.id));
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', async (req: any, res) => {
  await req.tenantClient
    .delete(schema.webhookSubscriptions)
    .where(eq(schema.webhookSubscriptions.id, req.params.id));
  res.json({ ok: true });
});

router.post('/:id/test', async (req: any, res) => {
  try {
    const [sub] = await req.tenantClient
      .select()
      .from(schema.webhookSubscriptions)
      .where(eq(schema.webhookSubscriptions.id, req.params.id));
    if (!sub) return res.status(404).json({ error: 'No encontrado' });
    webhookQueue.enqueue(
      req.tenantId,
      sub.id,
      sub.url,
      'test.ping',
      { message: 'Webhook de prueba desde Keirost', at: new Date().toISOString() },
      sub.secret || null,
    );
    res.json({ ok: true, hint: 'Encolado. Mira el servicio receptor.' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
