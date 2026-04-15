import { ClientFactory } from '../core/tenant/ClientFactory';
import * as schema from './schema';
import { eq } from 'drizzle-orm';

async function check() {
  const tDb = ClientFactory.getClient('tenant_openfactu');
  const batches = await tDb.select().from(schema.itemBatches).where(eq(schema.itemBatches.itemId, '1674394b-4c57-4de1-a385-bd82ac92ae7e'));
  console.log('Batches for Laptop Pro:', JSON.stringify(batches, null, 2));
}
check();
