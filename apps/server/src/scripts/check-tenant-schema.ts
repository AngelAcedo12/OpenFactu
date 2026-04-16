import { ClientFactory } from '../core/tenant/ClientFactory';
import { sql } from 'drizzle-orm';

async function diagnose() {
  const tenantId = process.argv[2];
  if (!tenantId) {
    console.error('Uso: npx ts-node src/scripts/check-tenant-schema.ts <tenantId>');
    process.exit(1);
  }

  try {
    const db = await ClientFactory.getTenantClient(tenantId);
    console.log(`Diagnosing tenant: ${tenantId}`);

    const whs = await db.execute(sql`
      SELECT id, name FROM "Warehouse"
    `);
    console.log('Warehouses in tenant:');
    console.table(whs.rows);

    const counts = await db.execute(sql`
      SELECT COUNT(*) as count FROM "WarehouseZone"
    `);
    console.log(`Rows in WarehouseZone: ${counts.rows[0].count}`);

    const samples = await db.execute(sql`
      SELECT name FROM "WarehouseZone" LIMIT 5
    `);
    const searchPath = await db.execute(sql`SHOW search_path`);
    console.log('Search path:', searchPath.rows[0]);
  } catch (err) {
    console.error('Diagnosis failed:', err);
  } finally {
    await ClientFactory.disconnectAll();
  }
}

diagnose();
