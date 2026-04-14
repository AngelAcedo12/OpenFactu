import { ClientFactory } from '../core/tenant/ClientFactory';
import * as schema from '../db/schema';

async function listTenants() {
  try {
    const db = ClientFactory.getClient('public');
    const tenants = await db.select().from(schema.tenants);
    console.log('Tenants found:');
    console.table(tenants.map(t => ({ id: t.id, name: t.name, schema: t.schemaName })));
  } catch (err) {
    console.error('Failed to list tenants:', err);
  } finally {
    await ClientFactory.disconnectAll();
  }
}

listTenants();
