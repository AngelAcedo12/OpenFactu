import { ClientFactory } from '../core/tenant/ClientFactory';
import * as schema from '../db/schema';
import { sql } from 'drizzle-orm';

async function check() {
  const schemaName = 'tenant_openfactu'; // El esquema que usa el usuario
  const db = ClientFactory.getClient(schemaName);

  console.log(`Checking table ItemPrice in ${schemaName}...`);
  try {
    const result = await db.execute(sql.raw(`SELECT count(*) FROM "${schemaName}"."ItemPrice"`));
    console.log('Table ItemPrice exists. Rows:', result.rows[0]);
  } catch (e: any) {
    console.error('Error checking ItemPrice:', e.message);
  }

  console.log(`Checking table PriceList in ${schemaName}...`);
  try {
    const result = await db.execute(sql.raw(`SELECT count(*) FROM "${schemaName}"."PriceList"`));
    console.log('Table PriceList exists. Rows:', result.rows[0]);
  } catch (e: any) {
    console.error('Error checking PriceList:', e.message);
  }
}

check();
