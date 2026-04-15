import { ClientFactory } from '../core/tenant/ClientFactory';
import * as schema from './schema';
import { eq, inArray } from 'drizzle-orm';

async function check() {
  const tDb = ClientFactory.getClient('tenant_openfactu');
  const lineIds = ['dcb4b442-affc-40ac-9971-12d0561de5e9', '7b8ee159-6916-4174-87a2-9aed6d780463', 'b6ccde0d-0aaa-4dd6-94c5-595efac495e4'];
  const lines = await tDb.select({ id: schema.purchaseDeliveryNoteLines.id, warehouseId: schema.purchaseDeliveryNoteLines.warehouseId })
    .from(schema.purchaseDeliveryNoteLines)
    .where(inArray(schema.purchaseDeliveryNoteLines.id, lineIds));
  console.log('Lines:', JSON.stringify(lines, null, 2));
}
check();
