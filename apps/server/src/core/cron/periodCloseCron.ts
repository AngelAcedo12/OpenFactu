/**
 * Cron ligero que busca períodos con `endDate` ya pasada y aún `status='O'`.
 * Por cada admin del tenant emite una notificación in-app. NO cierra nada
 * — el cierre requiere confirmación manual desde la UI (o POST /close).
 *
 * Implementado con setInterval para evitar añadir node-cron. Se ejecuta
 * al arrancar (tras 30s de warmup) y luego cada 6h.
 */
import { ClientFactory } from '../tenant/ClientFactory';
import * as schema from '../../db/schema';
import { eq } from 'drizzle-orm';
import { PeriodCloseEngine } from '../accounting/PeriodCloseEngine';

const INTERVAL_MS = 6 * 60 * 60 * 1000; // 6h
const WARMUP_MS = 30 * 1000;

let started = false;

async function runOnce() {
  try {
    const publicDb = ClientFactory.getClient('public');
    const tenantsList = await publicDb.select().from(schema.tenants);

    for (const tenant of tenantsList) {
      try {
        const tenantDb = ClientFactory.getClient(tenant.schemaName);

        // Admins del tenant (memberships + fallback global admins con tenantId)
        const memberships = await publicDb
          .select()
          .from(schema.userTenantMemberships)
          .where(eq(schema.userTenantMemberships.tenantId, tenant.id));
        const adminIds = memberships
          .filter((m: any) => m.role === 'ADMIN' || m.role === 'SUPERUSER')
          .map((m: any) => m.userId);

        if (adminIds.length === 0) continue;

        const n = await PeriodCloseEngine.scanAndNotify(tenantDb, adminIds);
        if (n > 0) {
          console.log(
            `[periodCloseCron] ${n} notificacion(es) de cierre creadas en ${tenant.schemaName}`,
          );
        }
      } catch (err: any) {
        console.warn(
          `[periodCloseCron] Error procesando tenant ${tenant.schemaName}:`,
          err.message,
        );
      }
    }
  } catch (err: any) {
    console.error('[periodCloseCron] Fallo global:', err.message);
  }
}

export function startPeriodCloseCron() {
  if (started) return;
  started = true;
  setTimeout(() => {
    runOnce();
    setInterval(runOnce, INTERVAL_MS);
  }, WARMUP_MS);
  console.log('[periodCloseCron] Scheduler armado (warmup 30s, intervalo 6h)');
}
