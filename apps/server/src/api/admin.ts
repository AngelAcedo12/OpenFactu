/**
 * Endpoints administrativos peligrosos. Solo para SUPERUSER.
 *
 *   GET  /api/admin/tenants/:id/export        — descarga zip del tenant
 *   POST /api/admin/tenants/import            — sube zip y crea tenant nuevo
 *   GET  /api/admin/tenants/:id/export-data   — descarga CSVs genéricos
 */

import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema';
import { ClientFactory } from '../core/tenant/ClientFactory';
import { TenantBackup } from '../core/tenant/TenantBackup';
import { ErpDataExporter } from '../core/export/ErpDataExporter';

const router = Router();
const upload = multer({
  dest: '/tmp/openfactu-tenant-import/',
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
});

/**
 * Las acciones admin son destructivas/sensibles. Reglas:
 *  - ADMIN: puede exportar/importar/exportar-CSV de SU tenant (req.user.tenantId).
 *  - SUPERUSER: puede tocar cualquier tenant.
 *  - Resto: 403.
 *
 * Validamos rol global y, en cada endpoint con `:id`, que coincida con el
 * tenant del usuario si no es SUPERUSER.
 */
function requireAdminOrSuperuser(req: any, res: any, next: any) {
  const role = req.user?.role;
  if (role !== 'SUPERUSER' && role !== 'ADMIN') {
    return res.status(403).json({ error: 'Requiere rol ADMIN o SUPERUSER' });
  }
  next();
}

function ensureTenantAccess(req: any, res: any, tenantId: string): boolean {
  const role = req.user?.role;
  if (role === 'SUPERUSER') return true;
  if (req.user?.tenantId && req.user.tenantId === tenantId) return true;
  res.status(403).json({ error: 'No puedes operar sobre otra empresa' });
  return false;
}

router.use(requireAdminOrSuperuser);

/**
 * GET /api/admin/tenants/:id/export — zip con schema/data/uploads.
 */
router.get('/tenants/:id/export', async (req: any, res) => {
  if (!ensureTenantAccess(req, res, req.params.id)) return;
  try {
    // ?includeUploads=false  → omite los archivos adjuntos (más rápido y ligero)
    const includeUploads = req.query.includeUploads !== 'false';
    const buf = await TenantBackup.exportToZip(req.params.id, { includeUploads });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Length', String(buf.length));
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="tenant_${req.params.id}_${Date.now()}.zip"`,
    );
    res.end(buf);
  } catch (e: any) {
    console.error('[Admin.exportTenant] error:', e?.stack || e);
    res.status(500).json({ error: e?.message || 'Error al exportar' });
  }
});

/**
 * POST /api/admin/tenants/import — multipart "file" + ?name=NewName
 */
router.post('/tenants/import', upload.single('file'), async (req: any, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'falta el zip (campo "file")' });
    const newName = (req.query.name as string) || (req.body.name as string);
    if (!newName) return res.status(400).json({ error: 'name requerido (?name=...)' });

    const buf = await fs.promises.readFile(req.file.path);
    const result = await TenantBackup.importFromZip(buf, { newName });
    fs.promises.unlink(req.file.path).catch(() => {});
    res.json(result);
  } catch (e: any) {
    console.error('[Admin.importTenant] error:', e?.stack || e);
    if (req.file?.path) fs.promises.unlink(req.file.path).catch(() => {});
    res.status(500).json({ error: e?.message || 'Error al importar' });
  }
});

/**
 * GET /api/admin/tenants/:id/export-data — CSVs por entidad.
 */
router.get('/tenants/:id/export-data', async (req: any, res) => {
  if (!ensureTenantAccess(req, res, req.params.id)) return;
  try {
    const publicDb = ClientFactory.getClient('public');
    const [tenant] = await publicDb
      .select()
      .from(schema.tenants)
      .where(eq(schema.tenants.id, req.params.id));
    if (!tenant) return res.status(404).json({ error: 'Tenant no encontrado' });

    const tenantClient = await ClientFactory.getTenantClient(req.params.id);
    const buf = await ErpDataExporter.exportToZip(tenantClient);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="erp_data_${tenant.schemaName}_${Date.now()}.zip"`,
    );
    res.end(buf);
  } catch (e: any) {
    console.error('[Admin.exportData] error:', e?.stack || e);
    res.status(500).json({ error: e?.message || 'Error al exportar datos' });
  }
});

export default router;
