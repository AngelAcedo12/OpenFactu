import fs from 'fs';
import path from 'path';
import { ClientFactory } from './ClientFactory';
import { sql } from 'drizzle-orm';
import * as schema from '../../db/schema';

/**
 * MigrationManager lee archivos .sql de la carpeta /migrations 
 * y los aplica a cada esquema de empresa usando Drizzle.
 */
export class MigrationManager {
  
  private static MIGRATIONS_DIR = path.join(__dirname, 'migrations');

  /**
   * Sincroniza una empresa específica.
   */
  public static async syncTenant(schemaName: string) {
    const db = ClientFactory.getClient(schemaName);
    console.log(`[MigrationManager] Verificando esquema: ${schemaName}`);

    // 1. Asegurar tabla de historia (SQL Directo)
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS "${schemaName}"."_MigrationHistory" (
        "id" TEXT PRIMARY KEY,
        "description" TEXT,
        "appliedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `));

    // 2. Leer archivos SQL
    if (!fs.existsSync(this.MIGRATIONS_DIR)) {
      console.warn(`[MigrationManager] Carpeta de migraciones ausente: ${this.MIGRATIONS_DIR}`);
      return;
    }

    const files = fs.readdirSync(this.MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const migrationId = file.replace('.sql', '');
      
      // Verificar si ya se aplicó
      const result: any = await db.execute(sql.raw(
        `SELECT id FROM "${schemaName}"."_MigrationHistory" WHERE id = '${migrationId}'`
      ));

      if (result.rows.length === 0) {
        console.log(`[MigrationManager] Aplicando migración: ${file}`);
        
        try {
          const filePath = path.join(this.MIGRATIONS_DIR, file);
          let rawSql = fs.readFileSync(filePath, 'utf8');
          const processedSql = rawSql.replace(/{{schema}}/g, schemaName);
          
          // Ejecutar SQL masivo
          await db.execute(sql.raw(processedSql));
          
          // Registrar éxito
          await db.execute(sql.raw(
            `INSERT INTO "${schemaName}"."_MigrationHistory" (id, description) VALUES ('${migrationId}', 'Aplicado desde ${file}')`
          ));
          
          console.log(`   ✅ Sincronizado correctamente.`);
        } catch (error: any) {
          console.error(`   ❌ Error en ${file}:`, error.message);
          throw error; 
        }
      }
    }
  }

  /**
   * Sincroniza todos los tenants.
   */
  public static async syncAllTenants() {
    console.log('[MigrationManager] Iniciando sincronización global...');
    const db = ClientFactory.getClient('public');
    
    try {
      // Usamos Drizzle tipado para obtener la lista de tenants
      const tenantsList = await db.select({ 
        schemaName: schema.tenants.schemaName 
      }).from(schema.tenants);

      for (const t of tenantsList) {
        await this.syncTenant(t.schemaName);
      }
      console.log('[MigrationManager] Sincronización finalizada.');
    } catch (error: any) {
      // Si la tabla no existe aún, informamos discretamente
      if (error.message.includes('relation "Tenant" does not exist')) {
        console.warn('[MigrationManager] Tabla Tenant no encontrada. Postergando sincronización global.');
      } else {
        console.error('[MigrationManager] Error en sincronización global:', error.message);
      }
    }
  }
}
