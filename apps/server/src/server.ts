import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { loadPlugins } from './plugins/loader';
import setupRouter from './api/setup';
import pluginsRouter from './api/plugins';
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
import { tenantContextMiddleware } from './api/middleware/tenantContext';
import { MigrationManager } from './core/tenant/MigrationManager';
import { bootstrapAdmin } from './core/auth/bootstrap';
import { ClientFactory } from './core/tenant/ClientFactory';
import { sql } from 'drizzle-orm';

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

// 3. Rutas de Plugins y Negocio
app.use('/api/plugins', pluginsRouter);
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
app.use('/api/sales', salesOrdersRouter);
app.use('/api/sales/delivery-notes', salesDeliveryNotesRouter);
app.use('/api/sales/invoices', salesInvoicesRouter);
app.use('/api/taxes', taxesRouter);


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
      console.log(`   [Wait] Reintentando conexión a la base de datos (${i + 1}/${retries})... Error: ${err.message}`);
      await new Promise(res => setTimeout(res, delay));
    }
  }
  throw new Error('No se pudo establecer conexión con la base de datos tras varios intentos.');
}

// Inicializar plugins y pasarles app para que inyecten rutas
const start = async () => {
  try {
    console.log('[Server] Iniciando OpenFactu...');
    await waitForDatabase();

    await bootstrapAdmin();
    console.log('[Bootstrap] Administrador verificado.');
    
    // Sincronizar esquemas de todos los tenants
    console.log('[Bootstrap] Sincronizando esquemas de empresas...');
    await MigrationManager.syncAllTenants();
    console.log('[Bootstrap] Esquemas sincronizados.');
    
    await loadPlugins(app);

    app.listen(PORT, () => {
      console.log(`[Server] OpenFactu escuchando en puerto ${PORT}`);
    });
  } catch (err) {
    console.error('[Bootstrap] Error al iniciar el servidor:', err);
    process.exit(1);
  }
};

start();
