import { Router } from 'express';
import { getCompanyConfig, setCompanyConfig, type CompanyConfig } from '../core/config/companyConfig';
import { logAudit } from '../utils/audit';

const router = Router();

router.get('/', async (req: any, res) => {
  try {
    const cfg = await getCompanyConfig(req.tenantClient);
    res.json(cfg);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/', async (req: any, res) => {
  try {
    const before = await getCompanyConfig(req.tenantClient);
    const patch: Partial<CompanyConfig> = req.body || {};
    const after = await setCompanyConfig(req.tenantClient, patch);
    res.json(after);
    logAudit({
      tenantClient: req.tenantClient,
      tenantId: req.tenantId || '',
      userId: req.user?.id,
      entityType: 'CompanyConfig',
      entityId: 'company',
      action: 'UPDATE',
      oldValue: before,
      newValue: after,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
