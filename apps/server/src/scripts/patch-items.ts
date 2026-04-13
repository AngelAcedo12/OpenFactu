import { ClientFactory } from '../core/tenant/ClientFactory';
import * as schema from '../db/schema';
import { sql } from 'drizzle-orm';

async function patchItems() {
  const db = ClientFactory.getClient('public');
  const tenants = await db.select().from(schema.tenants);
  
  console.log(`--- Parcheando ${tenants.length} empresas ---`);
  
  for (const t of tenants) {
    console.log(`-> Procesando: ${t.name} (${t.schemaName})`);
    try {
      // Usamos sql.raw para DDL dinámico en Drizzle
      await db.execute(sql.raw(`ALTER TABLE "${t.schemaName}"."Item" ADD COLUMN IF NOT EXISTS "description" TEXT`));
      await db.execute(sql.raw(`ALTER TABLE "${t.schemaName}"."Item" ADD COLUMN IF NOT EXISTS "categoryId" TEXT`));
      
      // Intentar añadir la FK
      try {
        await db.execute(sql.raw(`ALTER TABLE "${t.schemaName}"."Item" ADD CONSTRAINT "fk_item_category" FOREIGN KEY ("categoryId") REFERENCES "${t.schemaName}"."Category"(id)`));
      } catch (fkErr) {
        // Probablemente ya existe
      }
      
      console.log(`   ✅ Sincronizado`);
    } catch (err: any) {
      console.error(`   ❌ Error:`, err.message);
    }
  }

  process.exit(0);
}

patchItems();
