import { ClientFactory } from '../core/tenant/ClientFactory';
import * as schema from './schema';

async function check() {
  const tDb = ClientFactory.getClient('tenant_openfactu');
  const warehouses = await tDb.select().from(schema.warehouses);
  console.log('Warehouses:', JSON.stringify(warehouses, null, 2));
}
check();
