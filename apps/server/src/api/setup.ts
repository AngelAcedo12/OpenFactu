import { Router } from 'express';
import { ClientFactory } from '../core/tenant/ClientFactory';
import { SchemaManager } from '../core/tenant/SchemaManager';
import { AuthService } from '../core/auth/AuthService';
import { setCompanyConfig } from '../core/config/companyConfig';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const router = Router();

/**
 * GET /api/setup/status
 */
router.get('/status', async (req, res) => {
  try {
    const configPath = path.join(__dirname, '../../../../storage/config/config.json');
    const isConfigured = fs.existsSync(configPath);

    res.json({
      configured: isConfigured,
      setupNeeded: !isConfigured
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al comprobar el estado del sistema' });
  }
});

/**
 * POST /api/setup/init
 */
router.post('/init', async (req, res) => {
  const { admin, company, dbConfig } = req.body;

  try {
    const { host, port, user: dbUser, password } = dbConfig;
    const dynamicUrl = `postgresql://${dbUser}:${password}@${host}:${port}/openfactudb`;
    
    console.log(`[Setup] Intentando conectar a la DB: postgresql://${dbUser}:****@${host}:${port}/openfactudb`);
    
    await ClientFactory.setBaseUrl(dynamicUrl);

    const publicDb = ClientFactory.getClient('public');
    const adminUsername = admin.username || admin.email.split('@')[0];
    const hashedPassword = await AuthService.hashPassword(admin.password);
    
    // 1. Crear o Actualizar Admin Global (Upsert robusto con Drizzle)
    const adminId = crypto.randomUUID();
    await publicDb.insert(schema.globalUsers)
      .values({
        id: adminId,
        email: admin.email,
        username: adminUsername,
        password: hashedPassword,
        role: 'ADMIN',
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: schema.globalUsers.username,
        set: {
          email: admin.email,
          password: hashedPassword,
          role: 'ADMIN',
          updatedAt: new Date()
        }
      });

    // Resolver id real del admin (para el upsert puede no ser el generado arriba)
    const [adminRow] = await publicDb
      .select({ id: schema.globalUsers.id })
      .from(schema.globalUsers)
      .where(eq(schema.globalUsers.username, adminUsername));
    const effectiveAdminId = adminRow?.id || adminId;

    // 2. Provisión de Empresa (SchemaManager se encarga de todo: esquema + registro)
    const schemaName = `tenant_${company.name.toLowerCase().replace(/\s+/g, '_')}`;
    const tenantId = await SchemaManager.createTenantSchema(company.name, schemaName, { nif: company.nif });

    // 2a. Vincular al admin con la nueva empresa como ADMIN (idempotente)
    try {
      await publicDb.insert(schema.userTenantMemberships).values({
        id: crypto.randomUUID(),
        userId: effectiveAdminId,
        tenantId,
        role: 'ADMIN',
        updatedAt: new Date(),
      }).onConflictDoNothing();
    } catch (err: any) {
      console.warn('[Setup] No se pudo crear membership del admin:', err.message);
    }

    // 2b. Sembrar datos de empresa en SystemConfig del nuevo tenant
    try {
      const tenantDb = ClientFactory.getClient(schemaName);
      await setCompanyConfig(tenantDb, {
        name:            company.name,
        taxId:           company.nif || '',
        address:         company.address || '',
        city:            company.city || '',
        zipCode:         company.zipCode || '',
        country:         company.country || 'ES',
        email:           company.email || '',
        phone:           company.phone || '',
        website:         company.website || '',
        currency:        company.currency || 'EUR',
        fiscalYearStart: company.fiscalYearStart || '01-01',
      });
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
      tenantId: tenantId
    });
  } catch (error: any) {
    console.error('[Setup] Error en la inicialización:', error);
    res.status(500).json({ error: 'Fallo en la inicialización del sistema: ' + error.message });
  }
});

export default router;
