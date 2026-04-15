import { ClientFactory } from '../core/tenant/ClientFactory';
import * as schema from './schema';
import { eq } from 'drizzle-orm';

async function check() {
  const tDb = ClientFactory.getClient('tenant_openfactu');
  const batchNum1 = '213123123';
  const batchNum2 = '000001';
  
  const links1 = await tDb.select().from(schema.purchaseDeliveryNoteLineBatches).where(eq(schema.purchaseDeliveryNoteLineBatches.batchNum, batchNum1));
  console.log('Links for 213123123:', links1);
  const links2 = await tDb.select().from(schema.purchaseDeliveryNoteLineBatches).where(eq(schema.purchaseDeliveryNoteLineBatches.batchNum, batchNum2));
  console.log('Links for 000001:', links2);
}
check();
