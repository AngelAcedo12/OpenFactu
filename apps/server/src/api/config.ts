import { Router } from 'express';
import { getConfigSection, setConfigSection } from '../core/config/systemConfigSection';
import {
  BRANDING_DEFAULTS,
  FORMAT_DEFAULTS,
  FLAGS_DEFAULTS,
  type BrandingConfig,
  type FormatConfig,
  type FlagsConfig,
} from '../core/config/appConfig';
import { getStorageConfig, setStorageConfig } from '../core/config/storageConfig';
import { StorageResolver } from '../core/storage/StorageResolver';
import { logAudit } from '../utils/audit';

const router = Router();

function mount<T extends Record<string, any>>(section: string, defaults: T, entityType: string) {
  router.get(`/${section}`, async (req: any, res) => {
    // Sin tenant no hay SystemConfig — devolvemos defaults en vez de romper
    if (!req.tenantId) {
      return res.json(defaults);
    }
    try {
      const cfg = await getConfigSection(req.tenantClient, section, defaults);
      res.json(cfg);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.put(`/${section}`, async (req: any, res) => {
    if (!req.tenantId) {
      return res.status(400).json({ error: 'Se requiere tenant para modificar configuración' });
    }
    try {
      const before = await getConfigSection(req.tenantClient, section, defaults);
      const after = await setConfigSection(req.tenantClient, section, defaults, req.body || {});
      res.json(after);
      logAudit({
        tenantClient: req.tenantClient,
        tenantId: req.tenantId || '',
        userId: req.user?.id,
        entityType,
        entityId: section,
        action: 'UPDATE',
        oldValue: before,
        newValue: after,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
}

mount<BrandingConfig>('branding', BRANDING_DEFAULTS, 'BrandingConfig');
mount<FormatConfig>('format', FORMAT_DEFAULTS, 'FormatConfig');
mount<FlagsConfig>('flags', FLAGS_DEFAULTS, 'FlagsConfig');

/**
 * GET /api/config/storage — devuelve la config de almacenamiento del tenant
 *   { provider: 'local'|'gdrive'|'onedrive', local: {basePath?}, gdrive: {...}, onedrive: {...} }
 */
router.get('/storage', async (req: any, res) => {
  if (!req.tenantId) return res.json({ provider: 'local' });
  try {
    const cfg = await getStorageConfig(req.tenantClient);
    res.json(cfg);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Error al leer config de storage' });
  }
});

router.put('/storage', async (req: any, res) => {
  if (!req.tenantId) {
    return res.status(400).json({ error: 'Se requiere tenant para modificar configuración' });
  }
  try {
    const before = await getStorageConfig(req.tenantClient);
    await setStorageConfig(req.tenantClient, req.body || {});
    const after = await getStorageConfig(req.tenantClient);
    res.json(after);
    logAudit({
      tenantClient: req.tenantClient,
      tenantId: req.tenantId || '',
      userId: req.user?.id,
      entityType: 'StorageConfig',
      entityId: 'storage',
      action: 'UPDATE',
      oldValue: before,
      newValue: after,
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Error al guardar config de storage' });
  }
});

/**
 * POST /api/config/storage/healthcheck — diagnóstico del adapter activo.
 */
router.post('/storage/healthcheck', async (req: any, res) => {
  if (!req.tenantId) return res.status(400).json({ error: 'tenant requerido' });
  try {
    const tenantSchema = req.tenantSchema || '';
    const adapter = await StorageResolver.forTenant(req.tenantClient, tenantSchema);
    const r = await adapter.healthCheck();
    res.json({ provider: adapter.id, ...r });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Error al comprobar' });
  }
});

export default router;
