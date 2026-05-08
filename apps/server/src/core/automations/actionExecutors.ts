/**
 * Ejecutores de acciones de automatización. Cada ejecutor recibe la
 * config JSON del action y el contexto del trigger; devuelve un string
 * de output (o lanza si hay error).
 */
import crypto from 'crypto';
import { ClientFactory } from '../tenant/ClientFactory';
import * as schema from '../../db/schema';
import { sendMail } from '../email/Mailer';
import { broadcastEvent } from '../realtime/EventSocket';

export type ActionContext = Record<string, any>;

/** Handlebars-like muy simple: sustituye `{{path.to.value}}` en un string. */
export function renderTemplate(tpl: string, ctx: ActionContext): string {
  if (typeof tpl !== 'string') return '';
  return tpl.replace(/\{\{\s*([a-zA-Z0-9_.[\]]+)\s*\}\}/g, (_, path) => {
    const parts = String(path).split('.');
    let v: any = ctx;
    for (const p of parts) {
      if (v == null) return '';
      v = v[p];
    }
    if (v === null || v === undefined) return '';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  });
}

// ── EMAIL ─────────────────────────────────────────────────────────
export async function executeEmail(
  tenantId: string,
  tenantDb: any,
  config: any,
  ctx: ActionContext,
): Promise<string> {
  const to = renderTemplate(String(config?.to || ''), ctx).trim();
  const subject = renderTemplate(String(config?.subject || ''), ctx);
  const body = renderTemplate(String(config?.body || ''), ctx);
  if (!to) throw new Error('email action: falta `to`');
  const result = await sendMail(tenantId, tenantDb, {
    to,
    subject: subject || '(sin asunto)',
    text: body,
  });
  return `email enviado a ${to} (messageId=${result.messageId})`;
}

// ── WEBHOOK ───────────────────────────────────────────────────────
export async function executeWebhook(config: any, ctx: ActionContext): Promise<string> {
  const url = renderTemplate(String(config?.url || ''), ctx).trim();
  if (!url) throw new Error('webhook action: falta `url`');
  const method = (config?.method || 'POST').toUpperCase();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (config?.headers && typeof config.headers === 'object') {
    for (const [k, v] of Object.entries(config.headers)) {
      headers[k] = renderTemplate(String(v), ctx);
    }
  }
  const bodyTpl = config?.body;
  let body: string | undefined;
  if (bodyTpl) {
    if (typeof bodyTpl === 'string') body = renderTemplate(bodyTpl, ctx);
    else body = JSON.stringify(bodyTpl); // soporte plantilla como objeto literal
  } else {
    body = JSON.stringify(ctx); // payload por defecto = contexto
  }

  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, { method, headers, body, signal: controller.signal });
    const txt = await res.text().catch(() => '');
    if (!res.ok) throw new Error(`webhook respondió ${res.status}: ${txt.slice(0, 200)}`);
    return `webhook ${method} ${url} → ${res.status}`;
  } finally {
    clearTimeout(to);
  }
}

// ── NOTIFICATION (interno) ────────────────────────────────────────
export async function executeNotification(
  tenantId: string,
  schemaName: string,
  config: any,
  ctx: ActionContext,
): Promise<string> {
  const { sql } = await import('drizzle-orm');
  const { notifyTenant } = await import('../realtime/notifyTenant');
  const title = renderTemplate(String(config?.title || ''), ctx);
  const body = renderTemplate(String(config?.body || ''), ctx);
  const role = config?.role as string | undefined;
  const userId = config?.userId as string | undefined;
  if (!title) throw new Error('notification action: falta `title`');

  // Resolvemos la lista de userIds destinatarios según el filtro.
  let userIds: string[] | undefined;
  if (userId) {
    userIds = [userId];
  } else if (role && role !== 'USER') {
    const publicDb = ClientFactory.getClient('public');
    const safeTenant = String(tenantId).replace(/'/g, "''");
    const safeRole = String(role).replace(/'/g, "''");
    const r: any = await publicDb.execute(
      sql.raw(
        `SELECT "userId" FROM "UserTenantMembership" WHERE "tenantId" = '${safeTenant}' AND "role" = '${safeRole}'`,
      ),
    );
    userIds = (r.rows || []).map((x: any) => x.userId);
    if (userIds!.length === 0) return 'notification: 0 destinatarios';
  }
  // Si no se especificó ni userId ni role (o role='USER') → userIds queda
  // undefined y notifyTenant notifica a todos los miembros del tenant.

  const tenantDb = ClientFactory.getClient(schemaName);
  const count = await notifyTenant({
    tenantId,
    tenantClient: tenantDb,
    title,
    body,
    level: 'info',
    userIds,
  });
  return `notification: ${count} destinatarios`;
}
