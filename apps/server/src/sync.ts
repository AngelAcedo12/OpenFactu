import { MigrationManager } from './core/tenant/MigrationManager';
import { ClientFactory } from './core/tenant/ClientFactory';
import { sql } from 'drizzle-orm';

async function sync() {
  const publicDb = ClientFactory.getClient('public');
  const schema = await import('./db/schema');
  try {
    console.log('--- Iniciando Sincronización Manual ---');
    const tenantsList = await publicDb
      .select({ schemaName: schema.tenants.schemaName })
      .from(schema.tenants);

    for (const t of tenantsList) {
      console.log(`\nVerificando Tenant: ${t.schemaName}`);
      const db = ClientFactory.getClient(t.schemaName);
      const applied = await db.execute(
        sql.raw(`SELECT id FROM "${t.schemaName}"."_MigrationHistory" ORDER BY id DESC LIMIT 5`),
      );
      console.log(
        'Últimas migraciones:',
        applied.rows.map((r: any) => r.id),
      );

      await MigrationManager.syncTenant(t.schemaName);
    }
    console.log('--- Sincronización Finalizada ---');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

sync();
