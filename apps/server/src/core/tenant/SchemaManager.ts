import { ClientFactory } from './ClientFactory';
import { MigrationManager } from './MigrationManager';
import { sql, eq, or } from 'drizzle-orm';
import * as schema from '../../db/schema';
import crypto from 'crypto';

/**
 * SchemaManager gestiona la creación física de esquemas en Postgres 
 * e industrializa el proceso de alta de nuevos tenants.
 */
export class SchemaManager {
  
  /**
   * Crea una nueva empresa: Esquema físico + Registro en Global
   */
  public static async createTenantSchema(name: string, schemaName: string, config: any = {}) {
    const publicDb = ClientFactory.getClient('public');
    
    console.log(`[SchemaManager] Iniciando provisión de empresa: ${name} (${schemaName})`);

    try {
      // 1. Verificar si ya existe un tenant con ese nombre o esquema para evitar conflictos de UNIQUE
      const [existing] = await publicDb.select()
        .from(schema.tenants)
        .where(
          or(
            eq(schema.tenants.name, name),
            eq(schema.tenants.schemaName, schemaName)
          )
        );

      let tenantId: string;

      if (existing) {
        console.log(`[SchemaManager] Empresa existente detectada (${existing.id}). Actualizando datos...`);
        tenantId = existing.id;
        await publicDb.update(schema.tenants)
          .set({
            name,
            schemaName,
            config: JSON.stringify({ ...JSON.parse(existing.config || '{}'), ...config, updatedAt: new Date() }),
            updatedAt: new Date()
          })
          .where(eq(schema.tenants.id, tenantId));
      } else {
        // 2. Registrar nuevo Tenant
        tenantId = crypto.randomUUID();
        await publicDb.insert(schema.tenants)
          .values({
            id: tenantId,
            name,
            schemaName,
            config: JSON.stringify({ ...config, createdAt: new Date() }),
            updatedAt: new Date()
          });
      }

      // 3. Crear esquema físico si no existe
      await publicDb.execute(sql.raw(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`));

      // 4. Ejecutar migraciones iniciales sobre el nuevo esquema
      await MigrationManager.syncTenant(schemaName);

      console.log(`[SchemaManager] ✅ Empresa ${name} lista para operar.`);
      return tenantId;
    } catch (error: any) {
      console.error(`[SchemaManager] Error en la provisión del tenant:`, error.message);
      throw error;
    }
  }
}
