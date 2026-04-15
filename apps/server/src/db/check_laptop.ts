import { ClientFactory } from '../core/tenant/ClientFactory';
import * as schema from './schema';
import { eq } from 'drizzle-orm';

async function check() {
  const db = ClientFactory.getClient('factu'); // Judging by prev tasks or public?
  // User selected OpenFactu earlier, I'll check all tenants if needed.
  // Actually I checked tenants earlier: Prueba, Factu, OpenFactu.
  // The user says "OpenFactu" earlier.
  
  const tenants = await db.select().from(schema.tenants);
  for (const t of tenants) {
    const tDb = ClientFactory.getClient(t.id);
    const item = await tDb.select().from(schema.items).where(eq(schema.items.name, 'Laptop Pro'));
    if (item.length > 0) {
      console.log('Tenant:', t.name, 'Item:', JSON.stringify(item[0], null, 2));
      const serials = await tDb.select().from(schema.itemSerials).where(eq(schema.itemSerials.itemId, item[0].id));
      console.log('Serials:', JSON.stringify(serials, null, 2));
      const batches = await tDb.select().from(schema.itemBatches).where(eq(schema.itemBatches.itemId, item[0].id));
      console.log('Batches:', JSON.stringify(batches, null, 2));
    }
  }
}
check();
