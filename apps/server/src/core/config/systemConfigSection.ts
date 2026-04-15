import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import * as schema from '../../db/schema';

/**
 * Convierte camelCase a snake_case: appName → app_name
 */
function camelToSnake(s: string): string {
  return s.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Castea un valor string de SystemConfig al tipo del default (boolean, number, string).
 */
function castFromString(raw: string, fallback: any): any {
  if (typeof fallback === 'boolean') return raw === 'true';
  if (typeof fallback === 'number') {
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  }
  return raw;
}

/**
 * Devuelve una sección de configuración (con prefijo dado) mezclada con los defaults.
 * Ejemplo: getConfigSection(db, 'branding', BRANDING_DEFAULTS) lee todas las keys
 * "branding_*" y las mapea a las propiedades del objeto defaults.
 */
export async function getConfigSection<T extends Record<string, any>>(
  db: any,
  prefix: string,
  defaults: T,
): Promise<T> {
  const rows = await db.select().from(schema.systemConfigs);
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value ?? '';

  const result: any = { ...defaults };
  for (const field of Object.keys(defaults)) {
    const key = `${prefix}_${camelToSnake(field)}`;
    if (map[key] !== undefined && map[key] !== '') {
      result[field] = castFromString(map[key], defaults[field]);
    }
  }
  return result as T;
}

/**
 * Hace upsert de todas las propiedades del patch en SystemConfig con el prefijo dado.
 */
export async function setConfigSection<T extends Record<string, any>>(
  db: any,
  prefix: string,
  defaults: T,
  patch: Partial<T>,
): Promise<T> {
  const validFields = Object.keys(defaults);
  for (const field of Object.keys(patch)) {
    if (!validFields.includes(field)) continue;
    const key = `${prefix}_${camelToSnake(field)}`;
    const value = String((patch as any)[field] ?? '');

    const existing = await db
      .select({ id: schema.systemConfigs.id })
      .from(schema.systemConfigs)
      .where(eq(schema.systemConfigs.key, key));

    if (existing.length > 0) {
      await db
        .update(schema.systemConfigs)
        .set({ value, updatedAt: new Date() })
        .where(eq(schema.systemConfigs.key, key));
    } else {
      await db.insert(schema.systemConfigs).values({
        id: crypto.randomUUID(),
        key,
        value,
        description: `Sección ${prefix}`,
        updatedAt: new Date(),
      });
    }
  }

  return getConfigSection(db, prefix, defaults);
}
