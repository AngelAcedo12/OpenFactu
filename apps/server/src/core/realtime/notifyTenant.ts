/**
 * Inserta una fila en la tabla `Notification` de un tenant para cada miembro
 * (userTenantMemberships). La campana del frontend las pollea cada 15s via
 * `/api/notifications/unread-count` y muestra badge + popover.
 *
 * `excludeUserId` — típicamente el creador del documento, para que no se
 * auto-notifique. Si se quiere notificar también al creador, pasar undefined.
 */
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { ClientFactory } from '../tenant/ClientFactory';
import * as schema from '../../db/schema';
import { broadcastEvent } from './EventSocket';

export type NotifLevel = 'info' | 'warn' | 'error' | 'success';

export interface NotifyOpts {
  tenantId: string;
  tenantClient: any; // drizzle client del schema del tenant
  title: string;
  body?: string;
  level?: NotifLevel;
  link?: string;
  excludeUserId?: string | null;
  /** Si se pasa, se usan estos destinatarios en lugar de todos los miembros. */
  userIds?: string[];
}

export async function notifyTenant(opts: NotifyOpts): Promise<number> {
  try {
    let userIds: string[];
    if (opts.userIds && opts.userIds.length > 0) {
      userIds = opts.userIds.filter((uid) => uid && uid !== opts.excludeUserId);
    } else {
      const publicDb = ClientFactory.getClient('public');
      const memberships = await publicDb
        .select({ userId: schema.userTenantMemberships.userId })
        .from(schema.userTenantMemberships)
        .where(eq(schema.userTenantMemberships.tenantId, opts.tenantId));
      userIds = memberships
        .map((m: any) => m.userId)
        .filter((uid: string) => uid && uid !== opts.excludeUserId);
    }
    if (userIds.length === 0) return 0;

    const rows = userIds.map((uid: string) => ({
      id: crypto.randomUUID(),
      userId: uid,
      title: opts.title,
      body: opts.body || null,
      level: opts.level || 'info',
      link: opts.link || null,
    }));
    await opts.tenantClient.insert(schema.notifications).values(rows);

    // Avisar al websocket → la campana se actualiza al instante.
    broadcastEvent(opts.tenantId, {
      type: 'notification.created',
      timestamp: Date.now(),
    } as any);

    return rows.length;
  } catch (err: any) {
    console.warn('[notifyTenant] Error:', err?.message);
    return 0;
  }
}
