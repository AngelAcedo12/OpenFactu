import { ClientFactory } from '../core/tenant/ClientFactory';
import * as schema from './schema';

async function check() {
  const publicDb = ClientFactory.getClient('public');
  const tenants = await publicDb.select().from(schema.tenants);
  console.log('Tenants:', JSON.stringify(tenants, null, 2));
}
check();
