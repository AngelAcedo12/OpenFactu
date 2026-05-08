import { Router } from 'express';
import { ClientFactory } from '../core/tenant/ClientFactory';
import { SchemaManager } from '../core/tenant/SchemaManager';
import { AuthService } from '../core/auth/AuthService';
import { setCompanyConfig } from '../core/config/companyConfig';
import { setConfigSection } from '../core/config/systemConfigSection';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const router = Router();

/**
 * GET /api/setup/status
 */
/**
 * Indica si el modo debug del setup está activo. Habilitado cuando se está en
 * desarrollo (NODE_ENV !== production) o cuando explícitamente se ha definido
 * `OPENFACTU_DEBUG_SETUP=1` en el entorno. En este modo se exponen endpoints
 * peligrosos (reset total) — fuera de él, devuelven 403.
 */
function isSetupDebugEnabled(): boolean {
  return (
    process.env.NODE_ENV !== 'production' || process.env.OPENFACTU_DEBUG_SETUP === '1'
  );
}

router.get('/status', async (req, res) => {
  try {
    const configPath = path.join(__dirname, '../../../../storage/config/config.json');
    const isConfigured = fs.existsSync(configPath);
    // Permite forzar el wizard aunque ya esté configurado (`?force=1`) — útil
    // en debug del setup para volver a entrar sin tocar archivos.
    const force = req.query.force === '1';

    res.json({
      configured: isConfigured && !force,
      setupNeeded: !isConfigured || force,
      debugEnabled: isSetupDebugEnabled(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al comprobar el estado del sistema' });
  }
});

/**
 * POST /api/setup/dev-reset — DESTRUCTIVO: vacía el config.json, tira todos
 * los tenant schemas y limpia las tablas globales (Tenant, GlobalUser,
 * UserTenantMembership, AuditLog) para que el wizard de setup vuelva a
 * arrancar desde cero. Solo disponible en modo debug.
 *
 * Body opcional:
 *   { keepGeo?: boolean }  — si true, no toca Country/Region/SubRegion/Locality
 *                            (por defecto sí los conserva, así no hay que
 *                            re-cargar 8000 municipios cada vez).
 */
router.post('/dev-reset', async (req, res) => {
  if (!isSetupDebugEnabled()) {
    return res.status(403).json({ error: 'Modo debug no habilitado' });
  }
  try {
    const publicDb = ClientFactory.getClient('public');

    // 1) Drop de cada schema de tenant.
    const tenants = await publicDb.select().from(schema.tenants);
    for (const t of tenants) {
      try {
        await publicDb.execute(
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          (await import('drizzle-orm')).sql.raw(
            `DROP SCHEMA IF EXISTS "${t.schemaName}" CASCADE`,
          ),
        );
      } catch (e: any) {
        console.warn(`[Setup.dev-reset] No se pudo dropear ${t.schemaName}: ${e.message}`);
      }
    }

    // 2) Limpiar tablas globales relacionadas con tenants/auth.
    await publicDb.delete(schema.auditLogs);
    await publicDb.delete(schema.userTenantMemberships);
    await publicDb.delete(schema.tenants);
    await publicDb.delete(schema.globalUsers);
    // pluginFields/pluginTables son globales pero pertenecen a plugins; los
    // dejamos a no ser que se pida lo contrario, no estorban al wizard.

    // 3) Borrar config.json.
    const configPath = path.join(__dirname, '../../../../storage/config/config.json');
    try {
      if (fs.existsSync(configPath)) fs.unlinkSync(configPath);
    } catch (e: any) {
      console.warn(`[Setup.dev-reset] No se pudo borrar ${configPath}: ${e.message}`);
    }

    res.json({
      ok: true,
      droppedTenants: tenants.length,
      message: 'Setup reseteado. Recarga el front para volver a ver el wizard.',
    });
  } catch (e: any) {
    console.error('[Setup.dev-reset] error:', e?.stack || e);
    res.status(500).json({ error: e?.message || 'Error al resetear setup' });
  }
});

/**
 * POST /api/setup/init
 */
router.post('/init', async (req, res) => {
  const { admin, company, dbConfig } = req.body;

  try {
    // Si dbConfig viene del frontend, intentar conectar con esa URL
    // Si no, usar la conexion existente (ya configurada por DATABASE_URL)
    if (dbConfig?.host && dbConfig.host !== 'db') {
      const { host, port, user: dbUser, password } = dbConfig;
      const dynamicUrl = `postgresql://${dbUser}:${password}@${host}:${port}/openfactudb`;
      console.log(`[Setup] Conectando a: postgresql://${dbUser}:****@${host}:${port}/openfactudb`);
      await ClientFactory.setBaseUrl(dynamicUrl);
    } else {
      console.log('[Setup] Usando conexion existente (DATABASE_URL)');
    }

    const publicDb = ClientFactory.getClient('public');
    const adminUsername = admin.username || admin.email.split('@')[0];
    const hashedPassword = await AuthService.hashPassword(admin.password);

    // 1. Crear o Actualizar Admin Global
    const adminId = crypto.randomUUID();
    await publicDb
      .insert(schema.globalUsers)
      .values({
        id: adminId,
        email: admin.email,
        username: adminUsername,
        password: hashedPassword,
        role: 'ADMIN',
      })
      .onConflictDoUpdate({
        target: schema.globalUsers.username,
        set: {
          email: admin.email,
          password: hashedPassword,
          role: 'ADMIN',
        },
      });

    // Resolver id real del admin (para el upsert puede no ser el generado arriba)
    const [adminRow] = await publicDb
      .select({ id: schema.globalUsers.id })
      .from(schema.globalUsers)
      .where(eq(schema.globalUsers.username, adminUsername));
    const effectiveAdminId = adminRow?.id || adminId;

    // 2. Provisión de Empresa (SchemaManager se encarga de todo: esquema + registro)
    const schemaName = `tenant_${company.name.toLowerCase().replace(/\s+/g, '_')}`;
    const tenantId = await SchemaManager.createTenantSchema(company.name, schemaName, {
      nif: company.nif,
    });

    // 2a. Vincular al admin con la nueva empresa como ADMIN (idempotente)
    try {
      await publicDb
        .insert(schema.userTenantMemberships)
        .values({
          id: crypto.randomUUID(),
          userId: effectiveAdminId,
          tenantId,
          role: 'ADMIN',
          updatedAt: new Date(),
        })
        .onConflictDoNothing();
    } catch (err: any) {
      console.warn('[Setup] No se pudo crear membership del admin:', err.message);
    }

    // 2b. Sembrar datos de empresa en SystemConfig del nuevo tenant
    try {
      const tenantDb = ClientFactory.getClient(schemaName);
      await setCompanyConfig(tenantDb, {
        name: company.name,
        taxId: company.nif || '',
        address: company.address || '',
        city: company.city || '',
        zipCode: company.zipCode || '',
        country: company.country || 'ES',
        email: company.email || '',
        phone: company.phone || '',
        website: company.website || '',
        currency: company.currency || 'EUR',
        fiscalYearStart: company.fiscalYearStart || '01-01',
      });

      // URL pública para los enlaces de emails (tracking, etc.). Si el
      // instalador la pasó explícitamente, la respetamos; si no, usamos el
      // Origin del navegador del admin como mejor aproximación.
      const publicBaseUrl =
        (company.publicBaseUrl as string | undefined)?.trim() ||
        (req.headers.origin as string | undefined)?.trim() ||
        '';
      if (publicBaseUrl) {
        await setConfigSection(
          tenantDb,
          'app',
          { publicBaseUrl: '' },
          { publicBaseUrl: publicBaseUrl.replace(/\/$/, '') },
        );
      }

      // Seed de tipos de documento fiscales según país (F1/F2/R1 en ES,
      // 33/34/61 en CL, I/E/T en MX...). Idempotente.
      const { seedDocumentTypesForCountry } = await import('../core/documents/seedDocumentTypes');
      const count = await seedDocumentTypesForCountry(tenantDb, company.country || 'ES');
      if (count > 0) {
        console.log(
          `[Setup] Sembrados ${count} tipos de documento para ${company.country || 'ES'}`,
        );
      }
    } catch (err: any) {
      console.warn('[Setup] No se pudieron sembrar datos de empresa en SystemConfig:', err.message);
    }

    // 3. Guardar configuración en archivo persistente
    const configPath = path.join(__dirname, '../../../../storage/config/config.json');
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });

    fs.writeFileSync(configPath, JSON.stringify({ dbConfig, company, schemaName }, null, 2));

    res.json({
      success: true,
      message: 'Sistema inicializado correctamente',
      tenantId: tenantId,
    });
  } catch (error: any) {
    console.error('[Setup] Error en la inicialización:', error);
    res.status(500).json({ error: 'Fallo en la inicialización del sistema: ' + error.message });
  }
});

export default router;
