import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq } from 'drizzle-orm';
import * as schema from '../../db/schema';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.join(__dirname, '../../../../../.env') });
}

export class ClientFactory {
  private static clients: Map<string, any> = new Map();
  private static pools: Map<string, Pool> = new Map();
  private static baseUrl: string = '';

  /**
   * Configura la URL base de la base de datos dinámicamente.
   */
  public static async setBaseUrl(url: string) {
    console.log(`[DrizzleFactory] Cambiando URL base y reiniciando conexiones...`);
    this.baseUrl = url;
    // Limpiar clientes existentes para forzar reconexión con la nueva URL
    await this.disconnectAll();
  }

  private static getBaseUrl(): string {
    if (!this.baseUrl) {
      this.baseUrl = process.env.DATABASE_URL || '';
    }
    return this.baseUrl;
  }

  /**
   * Obtiene un cliente de Drizzle configurado para un esquema específico.
   */
  public static getClient(schemaName: string = 'public') {
    if (this.clients.has(schemaName)) {
      return this.clients.get(schemaName);
    }

    const baseDbUrl = this.getBaseUrl();
    
    // Crear Pool con search_path forzado
    const pool = new Pool({ 
      connectionString: baseDbUrl,
      // Esta es la clave: le decimos a PG que este pool vive en este esquema
      options: `-c search_path="${schemaName}",public`
    });

    // En Drizzle no hay motor binario, solo pasamos el pool
    const db = drizzle(pool, { schema });

    this.clients.set(schemaName, db);
    this.pools.set(schemaName, pool);
    
    console.log(`[DrizzleFactory] Cliente listo para el esquema: ${schemaName}`);
    return db;
  }

  /**
   * Resuelve un ID de tenant a un cliente de Drizzle.
   */
  public static async getTenantClient(tenantId: string) {
    const publicDb = this.getClient('public');
    
    const [tenant] = await publicDb.select()
      .from(schema.tenants)
      .where(eq(schema.tenants.id, tenantId));

    if (!tenant) throw new Error(`Tenant con ID ${tenantId} no encontrado`);
    
    return this.getClient(tenant.schemaName);
  }

  public static async disconnectAll() {
    const poolCount = this.pools.size;
    if (poolCount > 0) {
      console.log(`[DrizzleFactory] Cerrando ${poolCount} pools de conexión...`);
      for (const [name, pool] of this.pools.entries()) {
        try {
          await pool.end();
          console.log(`   ✅ Pool ${name} cerrado.`);
        } catch (e) {
          console.error(`   ❌ Error al cerrar pool ${name}:`, e);
        }
      }
    }
    this.clients.clear();
    this.pools.clear();
  }
}
