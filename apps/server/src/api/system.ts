/**
 * Endpoints del cockpit del servidor. Solo SUPERUSER.
 *
 *   GET /api/system/metrics — snapshot CPU/RAM/disco/Node/Postgres/tenants
 */

import { Router } from 'express';
import { collectMetrics } from '../core/system/SystemMetrics';
import { collectServices, collectPlugins } from '../core/system/SystemServices';

const router = Router();

router.use((req: any, res, next) => {
  if (req.user?.role !== 'SUPERUSER') {
    return res.status(403).json({ error: 'Solo SUPERUSER' });
  }
  next();
});

router.get('/metrics', async (_req, res) => {
  try {
    const m = await collectMetrics();
    res.json(m);
  } catch (e: any) {
    console.error('[System.metrics] error:', e?.stack || e);
    res.status(500).json({ error: e?.message || 'Error al recolectar métricas' });
  }
});

router.get('/services', async (_req, res) => {
  try {
    const services = await collectServices();
    const plugins = collectPlugins();
    res.json({ services, plugins, collectedAt: new Date().toISOString() });
  } catch (e: any) {
    console.error('[System.services] error:', e?.stack || e);
    res.status(500).json({ error: e?.message || 'Error al recolectar servicios' });
  }
});

export default router;
