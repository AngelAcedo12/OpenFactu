import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { sql } from 'drizzle-orm';
import { loadPlugins } from './plugins/loader';
import setupRouter from './api/setup';
import pluginsRouter from './api/plugins';
import devKeysRouter from './api/devKeys';
import authRouter from './api/auth';
import usersRouter from './api/users';
import itemsRouter from './api/items';
import categoriesRouter from './api/categories';
import uomRouter from './api/uom';
import partnersRouter from './api/partners';
import pricelistsRouter from './api/pricelists';
import zonesRouter from './api/zones';
import warehousesRouter from './api/warehouses';
import partnerGroupsRouter from './api/partnerGroups';
import periodsRouter from './api/periods';
import seriesRouter from './api/series';
import purchasesRouter from './api/purchases';
import purchaseDeliveryNotesRouter from './api/purchaseDeliveryNotes';
import purchaseInvoicesRouter from './api/purchaseInvoices';
import salesOrdersRouter from './api/salesOrders';
import salesDeliveryNotesRouter from './api/salesDeliveryNotes';
import salesInvoicesRouter from './api/salesInvoices';
import taxesRouter from './api/taxes';
import auditLogsRouter from './api/auditLogs';
import membershipsRouter from './api/memberships';
import documentTemplatesRouter from './api/documentTemplates';
import companyRouter from './api/company';
import dashboardRouter from './api/dashboard';
import tenantsRouter from './api/tenants';
import configRouter from './api/config';
import searchRouter from './api/search';
import geoRouter from './api/geo';
import factuApiRouter from './api/factuapi';
import { tenantContextMiddleware } from './api/middleware/tenantContext';
import { MigrationManager } from './core/tenant/MigrationManager';
import { bootstrapAdmin } from './core/auth/bootstrap';
import { ClientFactory } from './core/tenant/ClientFactory';
import { seedGeo } from './core/geo/seedGeo';
import { PdfRenderer } from '@openfactu/pdf';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 1. Rutas de Configuración y Auth (Fuera del contexto de tenant obligatorio)
app.use('/api/setup', setupRouter);
app.use('/api/auth', authRouter);

// 2. Middleware de Contexto (Inyecta Prisma Tenant en req)
app.use('/api', tenantContextMiddleware);

// 3. Rutas de Plugins, Dev Keys y Negocio
app.use('/api/plugins', pluginsRouter);
app.use('/api/dev-keys', devKeysRouter);
// 4. Rustas de creación y gestion de usarios
app.use('/api/users', usersRouter);
app.use('/api/items', itemsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/uom', uomRouter);
app.use('/api/partners', partnersRouter);
app.use('/api/pricelists', pricelistsRouter);
app.use('/api/zones', zonesRouter);
app.use('/api/warehouses', warehousesRouter);
app.use('/api/partnerGroups', partnerGroupsRouter);
app.use('/api/periods', periodsRouter);
app.use('/api/series', seriesRouter);
app.use('/api/purchases', purchasesRouter);
app.use('/api/purchases/delivery-notes', purchaseDeliveryNotesRouter);
app.use('/api/purchases/invoices', purchaseInvoicesRouter);
app.use('/api/sales/delivery-notes', salesDeliveryNotesRouter);
app.use('/api/sales/invoices', salesInvoicesRouter);
app.use('/api/sales', salesOrdersRouter);
app.use('/api/taxes', taxesRouter);
app.use('/api/audit-logs', auditLogsRouter);
app.use('/api/memberships', membershipsRouter);
app.use('/api/document-templates', documentTemplatesRouter);
app.use('/api/company', companyRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/tenants', tenantsRouter);
app.use('/api/config', configRouter);
app.use('/api/search', searchRouter);
app.use('/api/geo', geoRouter);
app.use('/api/factuapi', factuApiRouter);

// Health check para el instalador y Docker
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Servidor OpenFactu en línea' });
});

/**
 * Espera a que la base de datos esté lista antes de continuar el arranque.
 */
async function waitForDatabase(retries = 10, delay = 2000) {
  const dbUrl = process.env.DATABASE_URL || '';
  const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':***@');
  console.log(`[Server] Intentando conectar a: ${maskedUrl}`);

  const db = ClientFactory.getClient('public');
  for (let i = 0; i < retries; i++) {
    try {
      await db.execute(sql`SELECT 1`);
      console.log('   ✅ Base de datos lista.');
      return;
    } catch (err: any) {
      console.log(
        `   [Wait] Reintentando conexión a la base de datos (${i + 1}/${retries})... Error: ${err.message}`,
      );
      await new Promise((res) => setTimeout(res, delay));
    }
  }
  throw new Error('No se pudo establecer conexión con la base de datos tras varios intentos.');
}

// Inicializar plugins y pasarles app para que inyecten rutas
const start = async () => {
  try {
    console.log('[Server] Iniciando OpenFactu...');
    await waitForDatabase();

    // Asegurar tablas del schema publico antes de cualquier operacion
    try {
      const publicDb = ClientFactory.getClient('public');
      await publicDb.execute(sql.raw(`
        CREATE TABLE IF NOT EXISTS "Tenant" (
          "id" TEXT PRIMARY KEY, "name" TEXT UNIQUE NOT NULL, "schemaName" TEXT UNIQUE NOT NULL,
          "config" TEXT, "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS "GlobalUser" (
          "id" TEXT PRIMARY KEY, "email" TEXT UNIQUE NOT NULL, "username" TEXT UNIQUE NOT NULL,
          "password" TEXT NOT NULL, "role" TEXT NOT NULL DEFAULT 'USER',
          "tenantId" TEXT REFERENCES "Tenant"("id"), "permissions" TEXT,
          "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS "UserTenantMembership" (
          "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "GlobalUser"("id") ON DELETE CASCADE,
          "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
          "role" TEXT NOT NULL DEFAULT 'USER', "permissions" TEXT,
          "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE ("userId", "tenantId")
        );
        CREATE TABLE IF NOT EXISTS "AuditLog" (
          "id" TEXT PRIMARY KEY, "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id"),
          "entityType" TEXT NOT NULL, "entityId" TEXT NOT NULL, "action" TEXT NOT NULL,
          "userId" TEXT REFERENCES "GlobalUser"("id"), "oldValue" JSONB, "newValue" JSONB,
          "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS "PluginField" (
          "id" TEXT PRIMARY KEY, "pluginId" TEXT NOT NULL, "tableName" TEXT NOT NULL,
          "fieldName" TEXT NOT NULL, "fieldType" TEXT NOT NULL, "label" TEXT NOT NULL,
          "isManaged" BOOLEAN NOT NULL DEFAULT TRUE,
          "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS "PluginTable" (
          "id" TEXT PRIMARY KEY, "pluginId" TEXT NOT NULL, "tableName" TEXT NOT NULL,
          "definition" TEXT NOT NULL,
          "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS "TenantPlugin" (
          "id" TEXT PRIMARY KEY,
          "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
          "pluginId" TEXT NOT NULL,
          "isActive" BOOLEAN NOT NULL DEFAULT FALSE,
          "config" TEXT,
          "activatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "deactivatedAt" TIMESTAMP,
          UNIQUE ("tenantId", "pluginId")
        );
        CREATE TABLE IF NOT EXISTS "DevApiKey" (
          "id" TEXT PRIMARY KEY,
          "clientId" TEXT UNIQUE NOT NULL,
          "clientSecret" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "createdBy" TEXT NOT NULL REFERENCES "GlobalUser"("id"),
          "tenantId" TEXT REFERENCES "Tenant"("id"),
          "permissions" TEXT DEFAULT 'plugin:push,plugin:reload',
          "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
          "lastUsedAt" TIMESTAMP,
          "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `));
      console.log('[Bootstrap] Tablas del schema publico verificadas.');
    } catch (err: any) {
      console.warn('[Bootstrap] No se pudieron verificar tablas publicas:', err.message);
    }

    await bootstrapAdmin();
    console.log('[Bootstrap] Administrador verificado.');

    // Seed de datos geográficos (países, provincias, municipios)
    try {
      await seedGeo(ClientFactory.getClient('public'));
    } catch (err: any) {
      console.warn('[Bootstrap] Seed geográfico falló:', err.message);
    }

    // Sincronizar esquemas de todos los tenants
    console.log('[Bootstrap] Sincronizando esquemas de empresas...');
    await MigrationManager.syncAllTenants();
    console.log('[Bootstrap] Esquemas sincronizados.');

    await loadPlugins(app);

    const server = app.listen(PORT, () => {
      console.log(`[Server] OpenFactu escuchando en puerto ${PORT}`);
    });

    // Hot reload de plugins en desarrollo
    if (process.env.NODE_ENV !== 'production') {
      try {
        const { startDevSocket } = require('./plugins/devSocket');
        const { startPluginWatcher } = require('./plugins/watcher');
        startDevSocket(server);
        startPluginWatcher();
      } catch (err: any) {
        console.warn('[DevMode] No se pudo activar hot reload:', err.message);
      }
    }
  } catch (err) {
    console.error('[Bootstrap] Error al iniciar el servidor:', err);
    process.exit(1);
  }
};

// Cerrar Puppeteer al recibir señal de apagado
const shutdown = async () => {
  console.log('[Server] Cerrando recursos...');
  try {
    await PdfRenderer.shutdown();
  } catch {
    /* noop */
  }
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start();
