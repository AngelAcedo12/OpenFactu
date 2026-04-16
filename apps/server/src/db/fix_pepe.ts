import { ClientFactory } from '../core/tenant/ClientFactory';
import * as schema from './schema';
import { eq } from 'drizzle-orm';

async function fix() {
  const db = ClientFactory.getClient('public');
  await db
    .update(schema.globalUsers)
    .set({ tenantId: 'a3d34a0b-ff6b-4cee-a06e-a268378b2044' })
    .where(eq(schema.globalUsers.username, 'pepe'));
  console.log('Pepe actualizado con OpenFactu');
}
fix();
