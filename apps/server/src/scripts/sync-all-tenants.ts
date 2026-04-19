/**
 * Re-aplica todas las migraciones tenant + seedDefaults para cada empresa
 * registrada en `Tenant`. Usar después de añadir migraciones nuevas o cuando
 * un servidor en producción no las haya aplicado al arrancar (por ejemplo,
 * porque los .sql no estaban en `dist/`).
 *
 * Ejecuta con: `npm run sync` desde apps/server.
 */

import { MigrationManager } from '../core/tenant/MigrationManager';
import { ClientFactory } from '../core/tenant/ClientFactory';

async function main() {
  console.log('[sync] Iniciando sincronización de todos los tenants…');
  try {
    await MigrationManager.syncAllTenants();
    console.log('[sync] ✅ Completado.');
  } catch (e: any) {
    console.error('[sync] ❌ Falló:', e?.stack || e?.message || e);
    process.exitCode = 1;
  } finally {
    await ClientFactory.disconnectAll();
  }
}

main();
