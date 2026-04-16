import { ClientFactory } from '../core/tenant/ClientFactory';
import * as schema from './schema';
import { eq } from 'drizzle-orm';

async function check() {
  const tDb = ClientFactory.getClient('tenant_openfactu');
  const batches = await tDb
    .select({ itemId: schema.itemBatches.itemId, batchNum: schema.itemBatches.batchNum })
    .from(schema.itemBatches)
    .where(eq(schema.itemBatches.batchNum, '000001'));
  console.log('Batches with 000001:', batches);
}
check();
