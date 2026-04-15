import { ClientFactory } from '../core/tenant/ClientFactory';
import * as schema from './schema';

async function check() {
  const db = ClientFactory.getClient('public');
  const users = await db.select().from(schema.globalUsers);
  console.log(JSON.stringify(users, null, 2));
}
check();
