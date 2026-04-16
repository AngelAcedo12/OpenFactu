/**
 * Generador OFFLINE de datos geográficos para 7 países.
 *
 * Ejecutar con:
 *   npx ts-node apps/server/src/scripts/generate-geo-seed.ts
 *
 * Lee/fetches los datasets oficiales y emite apps/server/src/seed-data/geo.json.
 * El JSON resultante se commitea al repo. El seed en runtime solo lo lee.
 */
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import https from 'https';

// ============================================================================
// CONFIG
// ============================================================================

const OUTPUT = path.join(__dirname, '..', 'seed-data', 'geo.json');
const ES_XLSX = path.join(__dirname, '..', 'seed-data', 'es-municipios-ine.xlsx');

// Metadata de los 7 países
const COUNTRIES = [
  {
    code: 'ES',
    name: 'España',
    nameEn: 'Spain',
    phonePrefix: '+34',
    currency: 'EUR',
    localeDefault: 'es-ES',
    taxIdRegex: '^[A-Z0-9]\\d{7}[A-Z0-9]$',
    taxIdLabel: 'NIF/CIF',
    taxIdExample: 'B12345678',
    postalCodeRegex: '^[0-9]{5}$',
    postalCodeLabel: 'Código postal',
    regionLabel: 'Comunidad Autónoma',
    subRegionLabel: 'Provincia',
    localityLabel: 'Municipio',
  },
  {
    code: 'PT',
    name: 'Portugal',
    nameEn: 'Portugal',
    phonePrefix: '+351',
    currency: 'EUR',
    localeDefault: 'pt-PT',
    taxIdRegex: '^\\d{9}$',
    taxIdLabel: 'NIF',
    taxIdExample: '123456789',
    postalCodeRegex: '^\\d{4}-\\d{3}$',
    postalCodeLabel: 'Código postal',
    regionLabel: null,
    subRegionLabel: 'Distrito',
    localityLabel: 'Concelho',
  },
  {
    code: 'FR',
    name: 'Francia',
    nameEn: 'France',
    phonePrefix: '+33',
    currency: 'EUR',
    localeDefault: 'fr-FR',
    taxIdRegex: '^\\d{14}$',
    taxIdLabel: 'SIRET',
    taxIdExample: '12345678901234',
    postalCodeRegex: '^\\d{5}$',
    postalCodeLabel: 'Code postal',
    regionLabel: 'Région',
    subRegionLabel: 'Département',
    localityLabel: 'Commune',
  },
  {
    code: 'IT',
    name: 'Italia',
    nameEn: 'Italy',
    phonePrefix: '+39',
    currency: 'EUR',
    localeDefault: 'it-IT',
    taxIdRegex: '^\\d{11}$',
    taxIdLabel: 'Partita IVA',
    taxIdExample: '12345678901',
    postalCodeRegex: '^\\d{5}$',
    postalCodeLabel: 'CAP',
    regionLabel: 'Regione',
    subRegionLabel: 'Provincia',
    localityLabel: 'Comune',
  },
  {
    code: 'DE',
    name: 'Alemania',
    nameEn: 'Germany',
    phonePrefix: '+49',
    currency: 'EUR',
    localeDefault: 'de-DE',
    taxIdRegex: '^DE\\d{9}$',
    taxIdLabel: 'USt-IdNr',
    taxIdExample: 'DE123456789',
    postalCodeRegex: '^\\d{5}$',
    postalCodeLabel: 'PLZ',
    regionLabel: 'Bundesland',
    subRegionLabel: 'Kreis',
    localityLabel: 'Gemeinde',
  },
  {
    code: 'GB',
    name: 'Reino Unido',
    nameEn: 'United Kingdom',
    phonePrefix: '+44',
    currency: 'GBP',
    localeDefault: 'en-GB',
    taxIdRegex: '^GB\\d{9}$',
    taxIdLabel: 'VAT',
    taxIdExample: 'GB123456789',
    postalCodeRegex: '^[A-Z]{1,2}\\d{1,2}[A-Z]?\\s*\\d[A-Z]{2}$',
    postalCodeLabel: 'Postcode',
    regionLabel: 'Country',
    subRegionLabel: 'County',
    localityLabel: 'Town',
  },
  {
    code: 'US',
    name: 'Estados Unidos',
    nameEn: 'United States',
    phonePrefix: '+1',
    currency: 'USD',
    localeDefault: 'en-US',
    taxIdRegex: '^\\d{2}-\\d{7}$',
    taxIdLabel: 'EIN',
    taxIdExample: '12-3456789',
    postalCodeRegex: '^\\d{5}(-\\d{4})?$',
    postalCodeLabel: 'ZIP',
    regionLabel: null,
    subRegionLabel: 'State',
    localityLabel: 'City',
  },
];

// ES: nombres oficiales INE de las 17 CCAA + 2 ciudades autónomas
const ES_CCAA: Record<string, string> = {
  '01': 'Andalucía',
  '02': 'Aragón',
  '03': 'Asturias, Principado de',
  '04': 'Balears, Illes',
  '05': 'Canarias',
  '06': 'Cantabria',
  '07': 'Castilla y León',
  '08': 'Castilla - La Mancha',
  '09': 'Cataluña',
  '10': 'Comunitat Valenciana',
  '11': 'Extremadura',
  '12': 'Galicia',
  '13': 'Madrid, Comunidad de',
  '14': 'Murcia, Región de',
  '15': 'Navarra, Comunidad Foral de',
  '16': 'País Vasco',
  '17': 'Rioja, La',
  '18': 'Ceuta',
  '19': 'Melilla',
};

// ES: 52 provincias con código INE y la CCAA a la que pertenecen
const ES_PROVINCES: Record<string, { name: string; ccaa: string }> = {
  '01': { name: 'Araba/Álava', ccaa: '16' },
  '02': { name: 'Albacete', ccaa: '08' },
  '03': { name: 'Alicante/Alacant', ccaa: '10' },
  '04': { name: 'Almería', ccaa: '01' },
  '05': { name: 'Ávila', ccaa: '07' },
  '06': { name: 'Badajoz', ccaa: '11' },
  '07': { name: 'Balears, Illes', ccaa: '04' },
  '08': { name: 'Barcelona', ccaa: '09' },
  '09': { name: 'Burgos', ccaa: '07' },
  '10': { name: 'Cáceres', ccaa: '11' },
  '11': { name: 'Cádiz', ccaa: '01' },
  '12': { name: 'Castellón/Castelló', ccaa: '10' },
  '13': { name: 'Ciudad Real', ccaa: '08' },
  '14': { name: 'Córdoba', ccaa: '01' },
  '15': { name: 'Coruña, A', ccaa: '12' },
  '16': { name: 'Cuenca', ccaa: '08' },
  '17': { name: 'Girona', ccaa: '09' },
  '18': { name: 'Granada', ccaa: '01' },
  '19': { name: 'Guadalajara', ccaa: '08' },
  '20': { name: 'Gipuzkoa', ccaa: '16' },
  '21': { name: 'Huelva', ccaa: '01' },
  '22': { name: 'Huesca', ccaa: '02' },
  '23': { name: 'Jaén', ccaa: '01' },
  '24': { name: 'León', ccaa: '07' },
  '25': { name: 'Lleida', ccaa: '09' },
  '26': { name: 'Rioja, La', ccaa: '17' },
  '27': { name: 'Lugo', ccaa: '12' },
  '28': { name: 'Madrid', ccaa: '13' },
  '29': { name: 'Málaga', ccaa: '01' },
  '30': { name: 'Murcia', ccaa: '14' },
  '31': { name: 'Navarra', ccaa: '15' },
  '32': { name: 'Ourense', ccaa: '12' },
  '33': { name: 'Asturias', ccaa: '03' },
  '34': { name: 'Palencia', ccaa: '07' },
  '35': { name: 'Palmas, Las', ccaa: '05' },
  '36': { name: 'Pontevedra', ccaa: '12' },
  '37': { name: 'Salamanca', ccaa: '07' },
  '38': { name: 'Santa Cruz de Tenerife', ccaa: '05' },
  '39': { name: 'Cantabria', ccaa: '06' },
  '40': { name: 'Segovia', ccaa: '07' },
  '41': { name: 'Sevilla', ccaa: '01' },
  '42': { name: 'Soria', ccaa: '07' },
  '43': { name: 'Tarragona', ccaa: '09' },
  '44': { name: 'Teruel', ccaa: '02' },
  '45': { name: 'Toledo', ccaa: '08' },
  '46': { name: 'Valencia/València', ccaa: '10' },
  '47': { name: 'Valladolid', ccaa: '07' },
  '48': { name: 'Bizkaia', ccaa: '16' },
  '49': { name: 'Zamora', ccaa: '07' },
  '50': { name: 'Zaragoza', ccaa: '02' },
  '51': { name: 'Ceuta', ccaa: '18' },
  '52': { name: 'Melilla', ccaa: '19' },
};

// DE: 16 Bundesländer hardcoded (no hay Kreise/Gemeinden por ahora)
const DE_LANDER = [
  ['DE-BW', 'Baden-Württemberg'],
  ['DE-BY', 'Bayern'],
  ['DE-BE', 'Berlin'],
  ['DE-BB', 'Brandenburg'],
  ['DE-HB', 'Bremen'],
  ['DE-HH', 'Hamburg'],
  ['DE-HE', 'Hessen'],
  ['DE-MV', 'Mecklenburg-Vorpommern'],
  ['DE-NI', 'Niedersachsen'],
  ['DE-NW', 'Nordrhein-Westfalen'],
  ['DE-RP', 'Rheinland-Pfalz'],
  ['DE-SL', 'Saarland'],
  ['DE-SN', 'Sachsen'],
  ['DE-ST', 'Sachsen-Anhalt'],
  ['DE-SH', 'Schleswig-Holstein'],
  ['DE-TH', 'Thüringen'],
];

// GB: 4 naciones constitutivas
const GB_COUNTRIES = [
  ['GB-ENG', 'England'],
  ['GB-WLS', 'Wales'],
  ['GB-SCT', 'Scotland'],
  ['GB-NIR', 'Northern Ireland'],
];

// ============================================================================
// UTILIDADES
// ============================================================================

function fetchText(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'openfactu-seed' } }, (res) => {
      if (
        (res.statusCode === 301 ||
          res.statusCode === 302 ||
          res.statusCode === 303 ||
          res.statusCode === 307 ||
          res.statusCode === 308) &&
        res.headers.location
      ) {
        let nextUrl = res.headers.location;
        // Relative redirect → resolver contra la URL original
        if (nextUrl.startsWith('/')) {
          const current = new URL(url);
          nextUrl = `${current.protocol}//${current.host}${nextUrl}`;
        }
        return fetchText(nextUrl).then(resolve, reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} @ ${url}`));
      let chunks: Buffer[] = [];
      const encoding = res.headers['content-encoding'];
      let stream: any = res;
      if (encoding === 'gzip') stream = res.pipe(zlib.createGunzip());
      else if (encoding === 'deflate') stream = res.pipe(zlib.createInflate());
      stream.on('data', (c: Buffer) => chunks.push(c));
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
      stream.on('error', reject);
    });
    req.on('error', reject);
  });
}

async function fetchJson<T>(url: string): Promise<T> {
  const txt = await fetchText(url);
  return JSON.parse(txt);
}

// Parser mínimo de xlsx (solo sheet1 + sharedStrings). Reutiliza la técnica ya probada.
function parseXlsx(filePath: string): Array<Record<string, string>> {
  const tmpDir = '/tmp/openfactu_xlsx_parse';
  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.mkdirSync(tmpDir, { recursive: true });
  // Usar unzip del sistema para descomprimir
  const { execSync } = require('child_process');
  execSync(`unzip -o "${filePath}" -d "${tmpDir}" > /dev/null`);

  const sharedStringsXml = fs.readFileSync(path.join(tmpDir, 'xl', 'sharedStrings.xml'), 'utf-8');
  const strings: string[] = [];
  const stringRe = /<t[^>]*>([^<]*)<\/t>/g;
  let m;
  while ((m = stringRe.exec(sharedStringsXml)) !== null) strings.push(m[1]);

  const sheetXml = fs.readFileSync(path.join(tmpDir, 'xl', 'worksheets', 'sheet1.xml'), 'utf-8');
  const rows: Array<Record<string, string>> = [];
  const rowRe = /<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g;
  const cellRe = /<c r="([A-Z]+)(\d+)"([^/>]*)(?:\/>|>([\s\S]*?)<\/c>)/g;
  while ((m = rowRe.exec(sheetXml)) !== null) {
    const rowContent = m[2];
    const cells: Record<string, string> = {};
    let cm;
    while ((cm = cellRe.exec(rowContent)) !== null) {
      const col = cm[1];
      const attrs = cm[3] || '';
      const content = cm[4] || '';
      const valMatch = /<v>([^<]*)<\/v>/.exec(content);
      let val = valMatch ? valMatch[1] : '';
      if (attrs.includes('t="s"') && val) {
        const idx = parseInt(val, 10);
        val = strings[idx] || val;
      }
      cells[col] = val;
    }
    rows.push(cells);
  }
  return rows;
}

// ============================================================================
// PROCESADORES POR PAÍS
// ============================================================================

type Region = { country: string; code: string; name: string };
type SubRegion = { country: string; region: string | null; code: string; name: string };
type Locality = { country: string; subRegion: string; code: string; name: string };

function buildES(): { regions: Region[]; subRegions: SubRegion[]; localities: Locality[] } {
  console.log('[ES] parseando xlsx del INE...');
  const rows = parseXlsx(ES_XLSX);
  // Fila 2 es header, datos empiezan en fila 3
  const dataRows = rows.filter((r) => r.A && /^\d+$/.test(r.A) && r.B);

  const regions: Region[] = Object.entries(ES_CCAA).map(([code, name]) => ({
    country: 'ES',
    code,
    name,
  }));

  const subRegions: SubRegion[] = Object.entries(ES_PROVINCES).map(([code, prov]) => ({
    country: 'ES',
    region: prov.ccaa,
    code,
    name: prov.name,
  }));

  const localities: Locality[] = dataRows.map((r) => {
    const cpro = r.B; // '01'
    const cmun = r.C; // '051'
    const nombre = r.E;
    return {
      country: 'ES',
      subRegion: cpro,
      code: `${cpro}${cmun}`,
      name: nombre,
    };
  });

  console.log(
    `[ES] ${regions.length} CCAA, ${subRegions.length} provincias, ${localities.length} municipios`,
  );
  return { regions, subRegions, localities };
}

async function buildPT(): Promise<{
  regions: Region[];
  subRegions: SubRegion[];
  localities: Locality[];
}> {
  console.log('[PT] fetching gist...');
  const raw = await fetchText(
    'https://gist.githubusercontent.com/tomahock/a6c07dd255d04499d8336237e35a4827/raw/',
  );
  const data: Array<{ level: number; code: number; name: string }> = JSON.parse(raw);

  // Level 1 = Distrito, Level 2 = Concelho, Level 3 = Freguesia (lo ignoramos)
  // El parent del concelho se deriva del code: floor(code / 100).
  // Ej: concelho 101 (Águeda) → distrito 1 (Aveiro); concelho 4101 → distrito 41.
  const regions: Region[] = []; // PT sin nivel de regiones
  const subRegions: SubRegion[] = data
    .filter((d) => d.level === 1)
    .map((d) => ({ country: 'PT', region: null, code: String(d.code), name: d.name }));
  const localities: Locality[] = data
    .filter((d) => d.level === 2)
    .map((d) => ({
      country: 'PT',
      subRegion: String(Math.floor(d.code / 100)),
      code: String(d.code),
      name: d.name,
    }));

  console.log(`[PT] ${subRegions.length} distritos, ${localities.length} concelhos`);
  return { regions, subRegions, localities };
}

async function buildFR(): Promise<{
  regions: Region[];
  subRegions: SubRegion[];
  localities: Locality[];
}> {
  console.log('[FR] fetching decoupage-administratif...');
  const [regs, deps] = await Promise.all([
    fetchJson<Array<{ code: string; nom: string }>>(
      'https://unpkg.com/@etalab/decoupage-administratif/data/regions.json',
    ),
    fetchJson<Array<{ code: string; nom: string; region: string }>>(
      'https://unpkg.com/@etalab/decoupage-administratif/data/departements.json',
    ),
  ]);

  const regions: Region[] = regs.map((r) => ({ country: 'FR', code: r.code, name: r.nom }));
  const subRegions: SubRegion[] = deps.map((d) => ({
    country: 'FR',
    region: d.region,
    code: d.code,
    name: d.nom,
  }));

  console.log(`[FR] ${regions.length} régions, ${subRegions.length} départements`);
  return { regions, subRegions, localities: [] };
}

async function buildIT(): Promise<{
  regions: Region[];
  subRegions: SubRegion[];
  localities: Locality[];
}> {
  console.log('[IT] fetching comuni-json...');
  const data: Array<{
    nome: string;
    codice: string;
    regione: { nome: string; codice: string };
    provincia: { nome: string; codice: string };
  }> = await fetchJson(
    'https://raw.githubusercontent.com/matteocontrini/comuni-json/master/comuni.json',
  );

  const regionMap = new Map<string, Region>();
  const provMap = new Map<string, SubRegion>();
  const localities: Locality[] = [];

  for (const c of data) {
    const regCode = c.regione.codice;
    const provCode = c.provincia.codice;
    if (!regionMap.has(regCode)) {
      regionMap.set(regCode, { country: 'IT', code: regCode, name: c.regione.nome });
    }
    if (!provMap.has(provCode)) {
      provMap.set(provCode, {
        country: 'IT',
        region: regCode,
        code: provCode,
        name: c.provincia.nome,
      });
    }
    localities.push({
      country: 'IT',
      subRegion: provCode,
      code: c.codice,
      name: c.nome,
    });
  }

  console.log(
    `[IT] ${regionMap.size} regioni, ${provMap.size} province, ${localities.length} comuni`,
  );
  return {
    regions: Array.from(regionMap.values()),
    subRegions: Array.from(provMap.values()),
    localities,
  };
}

function buildDE(): { regions: Region[]; subRegions: SubRegion[]; localities: Locality[] } {
  const regions: Region[] = DE_LANDER.map(([code, name]) => ({ country: 'DE', code, name }));
  console.log(`[DE] ${regions.length} Bundesländer (sin Kreise ni Gemeinden)`);
  return { regions, subRegions: [], localities: [] };
}

function buildGB(): { regions: Region[]; subRegions: SubRegion[]; localities: Locality[] } {
  const regions: Region[] = GB_COUNTRIES.map(([code, name]) => ({ country: 'GB', code, name }));
  console.log(`[GB] ${regions.length} constituent countries`);
  return { regions, subRegions: [], localities: [] };
}

async function buildUS(): Promise<{
  regions: Region[];
  subRegions: SubRegion[];
  localities: Locality[];
}> {
  console.log('[US] fetching fips-codes CSV...');
  const csv = await fetchText(
    'https://raw.githubusercontent.com/kjhealy/fips-codes/master/state_and_county_fips_master.csv',
  );
  const lines = csv
    .replace(/\r/g, '')
    .split('\n')
    .slice(1)
    .filter((l) => l.trim());

  const regions: Region[] = []; // US sin nivel de regiones
  const subRegions: SubRegion[] = [];
  const localities: Locality[] = [];

  // Mapa state-fips (dos dígitos) → state abbreviation
  const stateByFips = new Map<string, string>();

  // Primera pasada: identificar states (state='NA' significa agregado estatal o nacional)
  for (const line of lines) {
    const [fipsStr, rawName, state] = line.split(',');
    if (!fipsStr || !rawName) continue;
    const name = rawName.replace(/^"|"$/g, '');
    const fips = Number(fipsStr);
    if (!Number.isFinite(fips)) continue;

    // state-level rows tienen fips múltiplo de 1000 (ej: 1000 = Alabama, 6000 = California)
    if (state === 'NA' && fips > 0 && fips % 1000 === 0) {
      const stateFips = Math.floor(fips / 1000)
        .toString()
        .padStart(2, '0');
      subRegions.push({ country: 'US', region: null, code: stateFips, name });
      stateByFips.set(stateFips, name);
    }
  }

  // Segunda pasada: counties (5-digit FIPS)
  for (const line of lines) {
    const [fipsStr, rawName, state] = line.split(',');
    if (!fipsStr || !rawName) continue;
    const name = rawName.replace(/^"|"$/g, '');
    const fips = Number(fipsStr);
    if (!Number.isFinite(fips)) continue;
    if (state === 'NA') continue;
    // county: fips es de 4 o 5 dígitos, los primeros 1-2 son el state fips
    const stateFips = Math.floor(fips / 1000)
      .toString()
      .padStart(2, '0');
    if (!stateByFips.has(stateFips)) continue;
    const countyCode = fips.toString().padStart(5, '0');
    localities.push({
      country: 'US',
      subRegion: stateFips,
      code: countyCode,
      name,
    });
  }

  console.log(`[US] ${subRegions.length} states, ${localities.length} counties`);
  return { regions, subRegions, localities };
}

// ============================================================================
// MAIN
// ============================================================================

(async () => {
  const allRegions: Region[] = [];
  const allSubRegions: SubRegion[] = [];
  const allLocalities: Locality[] = [];

  const es = buildES();
  allRegions.push(...es.regions);
  allSubRegions.push(...es.subRegions);
  allLocalities.push(...es.localities);

  const pt = await buildPT();
  allRegions.push(...pt.regions);
  allSubRegions.push(...pt.subRegions);
  allLocalities.push(...pt.localities);

  const fr = await buildFR();
  allRegions.push(...fr.regions);
  allSubRegions.push(...fr.subRegions);
  allLocalities.push(...fr.localities);

  const it = await buildIT();
  allRegions.push(...it.regions);
  allSubRegions.push(...it.subRegions);
  allLocalities.push(...it.localities);

  const de = buildDE();
  allRegions.push(...de.regions);
  allSubRegions.push(...de.subRegions);
  allLocalities.push(...de.localities);

  const gb = buildGB();
  allRegions.push(...gb.regions);
  allSubRegions.push(...gb.subRegions);
  allLocalities.push(...gb.localities);

  const us = await buildUS();
  allRegions.push(...us.regions);
  allSubRegions.push(...us.subRegions);
  allLocalities.push(...us.localities);

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(
    OUTPUT,
    JSON.stringify(
      {
        countries: COUNTRIES,
        regions: allRegions,
        subRegions: allSubRegions,
        localities: allLocalities,
      },
      null,
      2,
    ),
  );

  console.log(`\n✅ Escrito: ${OUTPUT}`);
  console.log(
    `   ${COUNTRIES.length} países, ${allRegions.length} regiones, ${allSubRegions.length} subregiones, ${allLocalities.length} localidades`,
  );
})().catch((err) => {
  console.error('ERROR:', err);
  process.exit(1);
});
