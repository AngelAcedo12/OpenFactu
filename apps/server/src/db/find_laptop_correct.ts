import { ClientFactory } from '../core/tenant/ClientFactory';
import * as schema from './schema';
import { ilike, eq } from 'drizzle-orm';

async function check() {
  const publicDb = ClientFactory.getClient('public'); 
  const tenants = await publicDb.select().from(schema.tenants);
  for (const t of tenants) {
    console.log('--- Checking Tenant:', t.name, 'Schema:', t.schemaName, '---');
    const tDb = ClientFactory.getClient(t.schemaName);
    const items = await tDb.select().from(schema.items).where(ilike(schema.items.name, '%Laptop%'));
    if (items.length > 0) {
      for (const i of items) {
        console.log('Item:', i.name, 'ID:', i.id, 'manageBy:', i.manageBy);
        const serials = await tDb.select().from(schema.itemSerials).where(eq(schema.itemSerials.itemId, i.id));
        console.log('  Serials Count:', serials.length);
        if (serials.length > 0) {
          console.log('  Sample Serials:', serials.slice(0, 5).map(s => s.serialNum));
        }
        const batches = await tDb.select().from(schema.itemBatches).where(eq(schema.itemBatches.itemId, i.id));
        console.log('  Batches Count:', batches.length);
      }
    }
  }
}
check();
