import { ClientFactory } from './core/tenant/ClientFactory';
import { sql } from 'drizzle-orm';

async function debug() {
  const schemaName = 'angel'; // Assumed from context if visible, or I'll try to find one
  const publicDb = ClientFactory.getClient('public');
  const tenants = await publicDb.execute(sql.raw('SELECT "schemaName" FROM "Tenant" LIMIT 1'));
  if (tenants.rows.length === 0) {
    console.log('No tenants found');
    process.exit(0);
  }
  const tenantSchema = tenants.rows[0].schemaName;
  console.log('Checking schema:', tenantSchema);
  const db = ClientFactory.getClient(tenantSchema);

  const tables = await db.execute(
    sql.raw(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = '${tenantSchema}'`,
    ),
  );
  console.log(
    'Tables:',
    tables.rows.map((r: any) => r.table_name),
  );

  const cols = await db.execute(
    sql.raw(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'SalesOrderLine' AND table_schema = '${tenantSchema}'`,
    ),
  );
  console.log(
    'SalesOrderLine columns:',
    cols.rows.map((r: any) => r.column_name),
  );

  process.exit(0);
}

debug();
