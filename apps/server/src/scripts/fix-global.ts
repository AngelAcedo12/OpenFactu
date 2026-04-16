import { ClientFactory } from '../core/tenant/ClientFactory';

async function fixGlobal() {
  const pc = ClientFactory.getClient('public');
  console.log('--- Corrigiendo Esquema Global ---');

  const queries = [
    'ALTER TABLE "GlobalUser" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
    'ALTER TABLE "GlobalUser" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
    'ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
    'ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
  ];

  for (const q of queries) {
    try {
      await pc.$executeRawUnsafe(q);
      console.log('✅ Ejecutado:', q.substring(0, 30) + '...');
    } catch (err: any) {
      console.error('❌ Error en:', q.substring(0, 30), '->', err.message);
    }
  }

  process.exit(0);
}

fixGlobal();
