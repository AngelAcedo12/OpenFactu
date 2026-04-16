import { ClientFactory } from '../core/tenant/ClientFactory';
import * as schema from './schema';
import { ilike } from 'drizzle-orm';

async function check() {
  const db = ClientFactory.getClient('factu');
  const tenants = await db.select().from(schema.tenants);
  for (const t of tenants) {
    const tDb = ClientFactory.getClient(t.id);
    const item = await tDb.select().from(schema.items).where(ilike(schema.items.name, '%Laptop%'));
    if (item.length > 0) {
      console.log('Tenant:', t.name);
      console.log('Items:', JSON.stringify(item, null, 2));
      for (const i of item) {
        const serials = await tDb
          .select()
          .from(schema.itemSerials)
          .where(ilike(schema.itemSerials.itemId, i.id));
        console.log('Serials for', i.name, ':', serials.length);
      }
    }
  }
}
check();
