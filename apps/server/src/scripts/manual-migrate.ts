import { ClientFactory } from '../core/tenant/ClientFactory';
import { sql } from 'drizzle-orm';

async function run() {
  const schemaName = 'tenant_openfactu';
  const db = ClientFactory.getClient(schemaName);
  
  const sqlStatement = `
    CREATE TABLE IF NOT EXISTS "${schemaName}"."ItemPrice" (
      "id" TEXT PRIMARY KEY,
      "priceListId" TEXT NOT NULL REFERENCES "${schemaName}"."PriceList"("id") ON DELETE CASCADE,
      "itemId" TEXT NOT NULL REFERENCES "${schemaName}"."Item"("id") ON DELETE CASCADE,
      "price" DECIMAL(12, 4) NOT NULL,
      CONSTRAINT "unq_price_list_item" UNIQUE ("priceListId", "itemId")
    )
  `;

  console.log('Running manual migration...');
  try {
    await db.execute(sql.raw(sqlStatement));
    console.log('✅ Success!');
  } catch (e: any) {
    console.error('❌ Error:', e.message);
  }
}

run();
