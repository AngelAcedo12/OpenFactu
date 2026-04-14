import { ClientFactory } from '../apps/server/src/core/tenant/ClientFactory';
import { sql } from 'drizzle-orm';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../apps/server/.env') });

async function run() {
  const tenants = ['public', 'tenant_prueba', 'tenant_factu', 'tenant_openfactu'];
  
  for (const t of tenants) {
    try {
      console.log(`\n--- SCHEMA: ${t} ---`);
      const db = ClientFactory.getClient(t);
      const res: any = await db.execute(sql.raw(`SELECT * FROM "${t}"."_MigrationHistory" ORDER BY "appliedAt" DESC`));
      console.table(res.rows);
      
      if (t !== 'public') {
        const uomCols: any = await db.execute(sql.raw(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_schema = '${t}' AND table_name = 'UnitOfMeasure'
        `));
        console.log(`UoM Columns in ${t}:`);
        console.table(uomCols.rows);
      }
    } catch (e: any) {
      console.error(`Error checking ${t}: ${e.message}`);
    }
  }
  process.exit(0);
}

run();
