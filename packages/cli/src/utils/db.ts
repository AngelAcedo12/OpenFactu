import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq, sql } from 'drizzle-orm';
import { loadConfig } from './config';

// Importar schema de forma dinámica según la ruta del proyecto
import { getServerSrcDir } from './paths';
const schemaPath = require('path').join(getServerSrcDir(), 'db/schema');
const schema = require(schemaPath);

let pool: Pool | null = null;
let db: any = null;

export function getPublicDb() {
  if (db) return db;
  const config = loadConfig();
  pool = new Pool({ connectionString: config.databaseUrl });
  db = drizzle(pool, { schema });
  return db;
}

export function getTenantDb(schemaName: string) {
  const config = loadConfig();
  const url = `${config.databaseUrl}${config.databaseUrl.includes('?') ? '&' : '?'}options=-csearch_path%3D${schemaName}%2Cpublic`;
  const tenantPool = new Pool({ connectionString: url });
  return drizzle(tenantPool, { schema });
}

export async function getAllTenants() {
  const publicDb = getPublicDb();
  return publicDb.select().from(schema.tenants);
}

export async function getTenantByName(name: string) {
  const publicDb = getPublicDb();
  const [tenant] = await publicDb
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.name, name));
  return tenant || null;
}

export async function testConnection(): Promise<boolean> {
  try {
    const publicDb = getPublicDb();
    await publicDb.execute(sql.raw('SELECT 1'));
    return true;
  } catch {
    return false;
  }
}

export async function disconnect() {
  if (pool) {
    await pool.end();
    pool = null;
    db = null;
  }
}

export { schema, sql, eq };
