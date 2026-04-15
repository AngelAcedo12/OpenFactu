import { ClientFactory } from '../core/tenant/ClientFactory';
import * as schema from './schema';
import { eq } from 'drizzle-orm';

async function check() {
  const tDb = ClientFactory.getClient('tenant_openfactu');
  const stocks = await tDb.select().from(schema.itemWarehouseStocks).where(eq(schema.itemWarehouseStocks.itemId, '1674394b-4c57-4de1-a385-bd82ac92ae7e'));
  console.log('Stocks for Laptop Pro:', stocks);
}
check();
