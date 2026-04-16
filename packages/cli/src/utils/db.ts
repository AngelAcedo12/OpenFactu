import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq, sql } from 'drizzle-orm';
import path from 'path';
import { loadConfig } from './config';
import { getServerSrcDir } from './paths';

let pool: Pool | null = null;
let db: any = null;
let _schema: any = null;

function getSchema() {
  if (!_schema) {
    // Registrar ts-node si esta disponible (para leer .ts directamente)
    try {
      require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'commonjs', esModuleInterop: true } });
    } catch {}

    const srcPath = path.join(getServerSrcDir(), 'db/schema');
    const distPath = path.join(getServerSrcDir(), '..', 'dist/db/schema');

    try {
      _schema = require(srcPath);
    } catch {
      try {
        _schema = require(distPath);
      } catch {
        throw new Error(
          `No se pudo cargar el schema de la BD.\n` +
          `Intentado: ${srcPath}\n` +
          `Intentado: ${distPath}\n` +
          `Ejecuta 'npm install' en el directorio de OpenFactu.`
        );
      }
    }
  }
  return _schema;
}

export function getPublicDb() {
  if (db) return db;
  const config = loadConfig();
  pool = new Pool({ connectionString: config.databaseUrl });
  db = drizzle(pool, { schema: getSchema() });
  return db;
}

export function getTenantDb(schemaName: string) {
  const config = loadConfig();
  const url = `${config.databaseUrl}${config.databaseUrl.includes('?') ? '&' : '?'}options=-csearch_path%3D${schemaName}%2Cpublic`;
  const tenantPool = new Pool({ connectionString: url });
  return drizzle(tenantPool, { schema: getSchema() });
}

export async function getAllTenants() {
  const s = getSchema();
  const publicDb = getPublicDb();
  return publicDb.select().from(s.tenants);
}

export async function getTenantByName(name: string) {
  const s = getSchema();
  const publicDb = getPublicDb();
  const [tenant] = await publicDb
    .select()
    .from(s.tenants)
    .where(eq(s.tenants.name, name));
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

export { sql, eq };
export { getSchema as schema };
