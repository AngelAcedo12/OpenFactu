import fs from 'fs';
import path from 'path';
import { sql, eq } from 'drizzle-orm';
import * as schema from '../../db/schema';

/**
 * Posibles ubicaciones del geo.json. Probamos en orden:
 *   1. junto al __dirname del módulo compilado (dist/seed-data/geo.json).
 *   2. en src/seed-data por si el contenedor monta el repo entero.
 *   3. en /app/apps/server/src/seed-data por si el Dockerfile no copió a dist.
 *   4. variable de entorno OPENFACTU_GEO_JSON (override manual).
 *
 * El primero que exista gana. Sin esto, una instalación con un Dockerfile que
 * olvida copiar assets deja el wizard de setup sin países.
 */
function resolveGeoJsonPath(): string | null {
  const candidates = [
    process.env.OPENFACTU_GEO_JSON,
    path.join(__dirname, '..', '..', 'seed-data', 'geo.json'),
    path.join(__dirname, '..', '..', '..', 'src', 'seed-data', 'geo.json'),
    path.join(__dirname, '..', '..', '..', '..', 'src', 'seed-data', 'geo.json'),
    '/app/apps/server/src/seed-data/geo.json',
    '/app/apps/server/dist/seed-data/geo.json',
  ].filter(Boolean) as string[];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

interface GeoData {
  countries: Array<{
    code: string;
    name: string;
    nameEn: string;
    phonePrefix: string;
    currency: string;
    localeDefault: string;
    taxIdRegex: string;
    taxIdLabel: string;
    taxIdExample: string;
    postalCodeRegex: string;
    postalCodeLabel: string;
    regionLabel: string | null;
    subRegionLabel: string;
    localityLabel: string;
  }>;
  regions: Array<{ country: string; code: string; name: string }>;
  subRegions: Array<{ country: string; region: string | null; code: string; name: string }>;
  localities: Array<{ country: string; subRegion: string; code: string; name: string }>;
}

/**
 * Asegura las tablas geográficas en el schema public (CREATE TABLE IF NOT EXISTS).
 * Se ejecuta en cada arranque — es idempotente.
 */
async function ensurePublicGeoTables(db: any) {
  await db.execute(
    sql.raw(`
    CREATE TABLE IF NOT EXISTS "Country" (
      "code"            TEXT PRIMARY KEY,
      "name"            TEXT NOT NULL,
      "nameEn"          TEXT NOT NULL,
      "phonePrefix"     TEXT NOT NULL,
      "currency"        TEXT NOT NULL,
      "localeDefault"   TEXT NOT NULL,
      "taxIdRegex"      TEXT NOT NULL,
      "taxIdLabel"      TEXT NOT NULL,
      "taxIdExample"    TEXT NOT NULL,
      "postalCodeRegex" TEXT NOT NULL,
      "postalCodeLabel" TEXT NOT NULL,
      "regionLabel"     TEXT,
      "subRegionLabel"  TEXT NOT NULL,
      "localityLabel"   TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "Region" (
      "id"          TEXT PRIMARY KEY,
      "countryCode" TEXT NOT NULL REFERENCES "Country"("code"),
      "code"        TEXT NOT NULL,
      "name"        TEXT NOT NULL,
      UNIQUE ("countryCode", "code")
    );

    CREATE TABLE IF NOT EXISTS "SubRegion" (
      "id"          TEXT PRIMARY KEY,
      "countryCode" TEXT NOT NULL REFERENCES "Country"("code"),
      "regionId"    TEXT REFERENCES "Region"("id"),
      "code"        TEXT NOT NULL,
      "name"        TEXT NOT NULL,
      UNIQUE ("countryCode", "code")
    );

    CREATE TABLE IF NOT EXISTS "Locality" (
      "id"          TEXT PRIMARY KEY,
      "countryCode" TEXT NOT NULL REFERENCES "Country"("code"),
      "subRegionId" TEXT NOT NULL REFERENCES "SubRegion"("id"),
      "code"        TEXT NOT NULL,
      "name"        TEXT NOT NULL,
      UNIQUE ("countryCode", "code")
    );

    CREATE INDEX IF NOT EXISTS "Locality_name_idx" ON "Locality" ("name");
    CREATE INDEX IF NOT EXISTS "Locality_subregion_idx" ON "Locality" ("subRegionId");
  `),
  );
}

/**
 * Seed de datos geográficos desde geo.json.
 * - Upsert idempotente de countries (si cambian los defaults, se actualizan).
 * - Si ya hay >0 regiones en BD, asume seed previo y sale sin tocar regiones/subregiones/localidades.
 */
export async function seedGeo(db: any) {
  await ensurePublicGeoTables(db);

  const geoJsonPath = resolveGeoJsonPath();
  if (!geoJsonPath) {
    console.error(
      `[Geo] ❌ geo.json no encontrado en ninguna ubicación conocida.\n` +
        `   Sin él, el selector de países del wizard de setup saldrá vacío.\n` +
        `   Soluciones:\n` +
        `     a) Asegúrate de que el Dockerfile copia src/seed-data/* a dist/seed-data/.\n` +
        `     b) Pasa OPENFACTU_GEO_JSON=/ruta/al/geo.json como variable de entorno.\n` +
        `     c) Ejecuta 'npx ts-node src/scripts/generate-geo-seed.ts' para regenerarlo.`,
    );
    return;
  }
  console.log(`[Geo] Usando geo.json: ${geoJsonPath}`);

  const data: GeoData = JSON.parse(fs.readFileSync(geoJsonPath, 'utf-8'));

  // 1. Countries — upsert
  for (const c of data.countries) {
    await db
      .insert(schema.countries)
      .values(c)
      .onConflictDoUpdate({
        target: schema.countries.code,
        set: {
          name: c.name,
          nameEn: c.nameEn,
          phonePrefix: c.phonePrefix,
          currency: c.currency,
          localeDefault: c.localeDefault,
          taxIdRegex: c.taxIdRegex,
          taxIdLabel: c.taxIdLabel,
          taxIdExample: c.taxIdExample,
          postalCodeRegex: c.postalCodeRegex,
          postalCodeLabel: c.postalCodeLabel,
          regionLabel: c.regionLabel,
          subRegionLabel: c.subRegionLabel,
          localityLabel: c.localityLabel,
        },
      });
  }

  // 2. ¿Hay regiones ya? Si sí, saltamos (asumimos que el seed está hecho y es costoso re-hacerlo)
  const existingRegions = await db.select({ id: schema.regions.id }).from(schema.regions).limit(1);
  if (existingRegions.length > 0) {
    console.log(
      `[Geo] ${data.countries.length} países (upsert), regiones/subregiones/localidades ya existen — skip.`,
    );
    return;
  }

  // 3. Regions
  const regionIdMap = new Map<string, string>(); // "ES|16" -> uuid
  const crypto = require('crypto');
  for (const r of data.regions) {
    const id = crypto.randomUUID();
    regionIdMap.set(`${r.country}|${r.code}`, id);
    await db.insert(schema.regions).values({
      id,
      countryCode: r.country,
      code: r.code,
      name: r.name,
    });
  }

  // 4. SubRegions
  const subRegionIdMap = new Map<string, string>(); // "ES|01" -> uuid
  for (const sr of data.subRegions) {
    const id = crypto.randomUUID();
    subRegionIdMap.set(`${sr.country}|${sr.code}`, id);
    const regionId = sr.region ? regionIdMap.get(`${sr.country}|${sr.region}`) || null : null;
    await db.insert(schema.subRegions).values({
      id,
      countryCode: sr.country,
      regionId,
      code: sr.code,
      name: sr.name,
    });
  }

  // 5. Localities — en lotes para no saturar
  const BATCH_SIZE = 500;
  let batch: any[] = [];
  let inserted = 0;
  for (const l of data.localities) {
    const subRegionId = subRegionIdMap.get(`${l.country}|${l.subRegion}`);
    if (!subRegionId) continue; // skip huérfanos
    batch.push({
      id: crypto.randomUUID(),
      countryCode: l.country,
      subRegionId,
      code: l.code,
      name: l.name,
    });
    if (batch.length >= BATCH_SIZE) {
      await db.insert(schema.localities).values(batch);
      inserted += batch.length;
      batch = [];
    }
  }
  if (batch.length > 0) {
    await db.insert(schema.localities).values(batch);
    inserted += batch.length;
  }

  console.log(
    `[Geo] Seed completo: ${data.countries.length} países, ${data.regions.length} regiones, ${data.subRegions.length} subregiones, ${inserted} localidades.`,
  );
}
