import { ClientFactory } from '../core/tenant/ClientFactory';
import * as schema from './schema';

async function list() {
  const db = ClientFactory.getClient('factu'); 
  const tenants = await db.select().from(schema.tenants);
  for (const t of tenants) {
    const tDb = ClientFactory.getClient(t.id);
    const allItems = await tDb.select({ name: schema.items.name, id: schema.items.id, manageBy: schema.items.manageBy }).from(schema.items);
    console.log('Tenant:', t.name, 'Schemas:', t.id);
    console.log('Items:', allItems);
  }
}
list();
