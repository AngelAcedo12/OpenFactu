import { Router } from 'express';
import { MigrationEngine } from '../core/plugins/MigrationEngine';
import { TenantPluginCache } from '../core/plugins/TenantPluginCache';
import { ClientFactory } from '../core/tenant/ClientFactory';
import * as schema from '../db/schema';
import path from 'path';
import fs from 'fs';
import { activePlugins, activePluginManifests } from '../plugins/loader';
import { transpilePluginFile } from '../plugins/transpiler';
import { eq } from 'drizzle-orm';

const router = Router();

// ── Endpoints con rutas fijas (ANTES de las rutas con :pluginId) ──

/**
 * GET /api/plugins/available
 * Lista todos los plugins instalados con su estado de activación para el tenant actual.
 */
router.get('/available', (req: any, res) => {
  const tenantId = req.tenantId;
  const activeForTenant = tenantId ? TenantPluginCache.getActivePlugins(tenantId) : [];

  const result = activePluginManifests.map((m: any) => ({
    ...m,
    isActive: activeForTenant.includes(m.id),
  }));

  // Incluir plugins sin manifest (solo backend)
  for (const pluginId of activePlugins) {
    if (!result.find((r: any) => r.id === pluginId)) {
      result.push({
        id: pluginId,
        name: pluginId,
        isActive: activeForTenant.includes(pluginId),
      });
    }
  }

  res.json(result);
});

/**
 * GET /api/plugins/active
 * Lista plugins con su estado para el tenant actual.
 */
router.get('/active', (req: any, res) => {
  const tenantId = req.tenantId;
  const activeForTenant = tenantId ? TenantPluginCache.getActivePlugins(tenantId) : [];

  res.json(activePlugins.map((id) => ({
    id,
    isActive: activeForTenant.includes(id),
  })));
});

/**
 * GET /api/plugins/manifests
 * Devuelve solo los manifests de plugins activos para el tenant actual.
 */
router.get('/manifests', (req: any, res) => {
  const tenantId = req.tenantId;

  if (!tenantId) {
    return res.json(activePluginManifests);
  }

  const activeForTenant = TenantPluginCache.getActivePlugins(tenantId);
  const filtered = activePluginManifests.filter((m: any) => activeForTenant.includes(m.id));
  res.json(filtered);
});

/**
 * POST /api/plugins/register-field
 */
router.post('/register-field', async (req, res) => {
  const { pluginId, tableName, fieldName, fieldType, label } = req.body;

  try {
    await MigrationEngine.addCustomField({
      pluginId,
      tableName,
      fieldName,
      type: fieldType,
      label,
    });

    res.json({ success: true, message: `Campo ${fieldName} registrado y aplicado.` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/fields', async (req: any, res) => {
  try {
    const publicClient = ClientFactory.getClient('public');
    let results = await publicClient.select().from(schema.pluginFields);

    // Filtrar por plugins activos del tenant
    if (req.tenantId) {
      const activeForTenant = TenantPluginCache.getActivePlugins(req.tenantId);
      results = results.filter((f: any) => activeForTenant.includes(f.pluginId));
    }

    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/tables', async (req: any, res) => {
  try {
    const publicClient = ClientFactory.getClient('public');
    let results = await publicClient.select().from(schema.pluginTables);

    // Filtrar por plugins activos del tenant
    if (req.tenantId) {
      const activeForTenant = TenantPluginCache.getActivePlugins(req.tenantId);
      results = results.filter((t: any) => activeForTenant.includes(t.pluginId));
    }

    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/plugins/fields/:tableName?
 */
router.get('/fields/:tableName?', async (req: any, res) => {
  const { tableName } = req.params;
  const publicClient = ClientFactory.getClient('public');

  let fields;
  if (tableName) {
    fields = await publicClient
      .select()
      .from(schema.pluginFields)
      .where(eq(schema.pluginFields.tableName, tableName));
  } else {
    fields = await publicClient.select().from(schema.pluginFields);
  }

  // Filtrar por plugins activos del tenant
  if (req.tenantId) {
    const activeForTenant = TenantPluginCache.getActivePlugins(req.tenantId);
    fields = fields.filter((f: any) => activeForTenant.includes(f.pluginId));
  }

  res.json(fields);
});

// ── Endpoints con :pluginId ──

/**
 * POST /api/plugins/:pluginId/activate
 * Activa un plugin para el tenant actual.
 */
router.post('/:pluginId/activate', async (req: any, res) => {
  const { pluginId } = req.params;
  const tenantId = req.tenantId;

  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant requerido' });
  }

  if (!activePlugins.includes(pluginId)) {
    return res.status(404).json({ error: `Plugin "${pluginId}" no está instalado` });
  }

  try {
    await TenantPluginCache.activate(tenantId, pluginId);
    res.json({ success: true, pluginId, isActive: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/plugins/:pluginId/deactivate
 * Desactiva un plugin para el tenant actual.
 */
router.post('/:pluginId/deactivate', async (req: any, res) => {
  const { pluginId } = req.params;
  const tenantId = req.tenantId;

  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant requerido' });
  }

  try {
    await TenantPluginCache.deactivate(tenantId, pluginId);
    res.json({ success: true, pluginId, isActive: false });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/plugins/load/:pluginId/*
 * Carga dinámica y transpilación on-the-fly.
 */
router.get('/load/:pluginId/*', async (req, res) => {
  const { pluginId } = req.params;
  // Usamos req.params['0'] para evitar el error de tipado en TS
  const filePath = req.params['0'];

  const pluginsDir = path.resolve(__dirname, '../../../../plugins');
  const fullPath = path.join(pluginsDir, pluginId, filePath);

  // Seguridad básica: prevenir path traversal
  if (!fullPath.startsWith(pluginsDir)) {
    return res.status(403).json({ error: 'Acceso no autorizado fuera del directorio de plugins' });
  }

  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: 'Archivo de plugin no encontrado' });
  }

  const ext = path.extname(fullPath).toLowerCase();

  try {
    if (ext === '.tsx' || ext === '.ts' || ext === '.jsx') {
      const transpiledCode = await transpilePluginFile(fullPath);
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      return res.send(transpiledCode);
    }

    res.sendFile(fullPath);
  } catch (error: any) {
    console.error(`[PluginLoader] Error al cargar ${fullPath}:`, error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/plugins/sdk/*
 * Sirve los proxies ESM. Soporta nombres de paquetes complejos con slashes.
 */
router.get('/sdk/*', (req, res) => {
  // Capturamos todo lo que viene después de /sdk/ y quitamos el .js
  const rawPkg = req.params['0'];
  const pkg = rawPkg.replace(/^\//, '').replace(/\.js$/, '');

  const pkgMap: Record<string, string> = {
    react: 'window.React',
    'react-dom': 'window.ReactDOM',
    'lucide-react': 'window.Lucide',
    '@openfactu/ui': 'window.OpenFactuUI',
    'react-router-dom': 'window.ReactRouterDOM',
    '@openfactu/common': 'window.OpenFactuCommon',
  };

  const globalVar = pkgMap[pkg];

  if (!globalVar) {
    console.error(`[SDK] Paquete no mapeado: ${pkg}`);
    return res.status(404).send(`SDK Package "${pkg}" not found`);
  }

  const namedExportsMap: Record<string, string> = {
    react:
      'useState, useEffect, useMemo, useCallback, useRef, useContext, createContext, forwardRef, Fragment, Suspense, Children, cloneElement, isValidElement, lazy',
    'react-dom': 'createPortal',
    'lucide-react':
      'Star, Plus, Minus, Zap, Puzzle, X, Check, ChevronRight, ChevronDown, ChevronLeft, Search, Settings, Eye, EyeOff, Loader2, AlertCircle, Info, Bell, LayoutDashboard, Box, ExternalLink, RefreshCw, List, Trash2, Edit, Save, ArrowLeft, ArrowRight, UserPlus, Mail, Building, Shield, CheckCircle, AlertTriangle, Package, Globe, Users, FileText',
    '@openfactu/ui':
      'Button, Card, Table, Badge, Input, NavItem, Loader, Toast, ToastProvider, useToast',
    'react-router-dom': 'Link, useNavigate, useParams, useLocation, NavLink, Outlet',
    '@openfactu/common': 'useDocument, useDataTable',
  };

  const namedExports = namedExportsMap[pkg] || '';

  const esmCode = `// OpenFactu Plugin SDK - ${pkg}
const _pkg = ${globalVar};
if (!_pkg) {
  throw new Error('[OpenFactu SDK] Librería "${pkg}" no disponible en el objeto global.');
}
export default _pkg;
${namedExports ? `export const { ${namedExports} } = _pkg;` : ''}
`;

  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.send(esmCode);
});

export default router;
