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

export default router;
