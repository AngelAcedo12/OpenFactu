import { Router } from 'express';
import { MigrationEngine } from '../core/plugins/MigrationEngine';
import { ClientFactory } from '../core/tenant/ClientFactory';
import * as schema from '../db/schema';
import path from 'path';
import fs from 'fs';
import { activePlugins, activePluginManifests } from '../plugins/loader';
import { transpilePluginFile } from '../plugins/transpiler';
import { eq } from 'drizzle-orm';

const router = Router();

/**
 * GET /api/plugins/active
 */
router.get('/active', (req, res) => {
  res.json(activePlugins.map(id => ({ id, status: 'active' })));
});

/**
 * GET /api/plugins/manifests
 */
router.get('/manifests', (req, res) => {
  res.json(activePluginManifests);
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
      label
    });

    res.json({ success: true, message: `Campo ${fieldName} registrado y aplicado.` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/fields', async (req: any, res) => {
  try {
    const results = await req.tenantClient.select().from(schema.pluginFields);
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/tables', async (req: any, res) => {
  try {
    const results = await req.tenantClient.select().from(schema.pluginTables);
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/plugins/fields/:tableName?
 */
router.get('/fields/:tableName?', async (req, res) => {
  const { tableName } = req.params;
  const publicClient = ClientFactory.getClient('public');
  
  if (tableName) {
    const fields = await publicClient.select().from(schema.pluginFields).where(eq(schema.pluginFields.tableName, tableName));
    return res.json(fields);
  }

  const fields = await publicClient.select().from(schema.pluginFields);
  res.json(fields);
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
    'react': 'window.React',
    'react-dom': 'window.ReactDOM',
    'lucide-react': 'window.Lucide',
    '@openfactu/ui': 'window.OpenFactuUI',
    'react-router-dom': 'window.ReactRouterDOM',
    '@openfactu/common': 'window.OpenFactuCommon'
  };

  const globalVar = pkgMap[pkg];

  if (!globalVar) {
    console.error(`[SDK] Paquete no mapeado: ${pkg}`);
    return res.status(404).send(`SDK Package "${pkg}" not found`);
  }

  const namedExportsMap: Record<string, string> = {
    'react': 'useState, useEffect, useMemo, useCallback, useRef, useContext, createContext, forwardRef, Fragment, Suspense, Children, cloneElement, isValidElement, lazy',
    'react-dom': 'createPortal',
    'lucide-react': 'Star, Plus, Minus, Zap, Puzzle, X, Check, ChevronRight, ChevronDown, ChevronLeft, Search, Settings, Eye, EyeOff, Loader2, AlertCircle, Info, Bell, LayoutDashboard, Box, ExternalLink, RefreshCw, List, Trash2, Edit, Save, ArrowLeft, ArrowRight, UserPlus, Mail, Building, Shield, CheckCircle, AlertTriangle, Package, Globe, Users, FileText',
    '@openfactu/ui': 'Button, Card, Table, Badge, Input, NavItem, Loader, Toast, ToastProvider, useToast',
    'react-router-dom': 'Link, useNavigate, useParams, useLocation, NavLink, Outlet',
    '@openfactu/common': 'useDocument, useDataTable'
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