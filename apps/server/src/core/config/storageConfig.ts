/**
 * Helper de lectura/escritura de la config de almacenamiento (prefijo
 * `storage.*` en `systemConfigs`). Reaprovecha el patrón de
 * `companyConfig.ts` y `systemConfigSection.ts`.
 *
 * Estructura esperada:
 *   storage.provider              → 'local' | 'gdrive' | 'onedrive'
 *   storage.local.basePath        → opcional; default lo decide el resolver
 *   storage.gdrive.clientId       → OAuth credentials (Fase F)
 *   storage.gdrive.clientSecret
 *   storage.gdrive.refreshToken
 *   storage.gdrive.rootFolderId
 *   storage.onedrive.clientId     → OAuth credentials (Fase G)
 *   storage.onedrive.clientSecret
 *   storage.onedrive.refreshToken
 *   storage.onedrive.rootFolderId
 *
 * Los `*.clientSecret` y `*.refreshToken` se almacenan TAL CUAL por ahora —
 * cuando se implementen los adapters cloud se cifrarán con `JWT_SECRET`.
 */

import * as schema from '../../db/schema';

export interface StorageConfig {
  provider?: 'local' | 'gdrive' | 'onedrive';
  local?: { basePath?: string };
  gdrive?: {
    clientId?: string;
    clientSecret?: string;
    refreshToken?: string;
    rootFolderId?: string;
  };
  onedrive?: {
    clientId?: string;
    clientSecret?: string;
    refreshToken?: string;
    rootFolderId?: string;
  };
}

const PREFIX = 'storage.';

/**
 * Lee toda la sección `storage.*` y la devuelve como un objeto anidado.
 */
export async function getStorageConfig(db: any): Promise<StorageConfig> {
  const rows: Array<{ key: string; value: string | null }> = await db
    .select()
    .from(schema.systemConfigs);
  const out: any = {};
  for (const r of rows) {
    if (!r.key?.startsWith(PREFIX)) continue;
    const parts = r.key.slice(PREFIX.length).split('.');
    let cur = out;
    for (let i = 0; i < parts.length - 1; i++) {
      cur[parts[i]] = cur[parts[i]] || {};
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = r.value ?? '';
  }
  return out as StorageConfig;
}

/**
 * Persiste un patch parcial. Cualquier campo undefined no se toca; null
 * convierte el valor a cadena vacía. Genera/sobrescribe filas en
 * `systemConfigs` con el prefijo `storage.`.
 */
export async function setStorageConfig(db: any, patch: StorageConfig): Promise<void> {
  const flat: Record<string, string | null> = flatten(patch, PREFIX);
  for (const [key, value] of Object.entries(flat)) {
    if (value === undefined) continue;
    await upsertOne(db, key, value);
  }
}

function flatten(obj: any, prefix: string, out: Record<string, any> = {}): Record<string, any> {
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix + k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      flatten(v, fullKey + '.', out);
    } else {
      out[fullKey] = v as any;
    }
  }
  return out;
}

async function upsertOne(db: any, key: string, value: string | null): Promise<void> {
  const { eq } = await import('drizzle-orm');
  const crypto = await import('crypto');
  const existing = await db
    .select({ id: schema.systemConfigs.id })
    .from(schema.systemConfigs)
    .where(eq(schema.systemConfigs.key, key));
  if (existing.length > 0) {
    await db
      .update(schema.systemConfigs)
      .set({ value: value ?? '', updatedAt: new Date() })
      .where(eq(schema.systemConfigs.key, key));
  } else {
    await db.insert(schema.systemConfigs).values({
      id: crypto.randomUUID(),
      key,
      value: value ?? '',
      updatedAt: new Date(),
    });
  }
}
