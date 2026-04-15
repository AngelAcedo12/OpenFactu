/**
 * Convierte un número a texto en español. Cubre hasta 999.999.999.
 * Ejemplos:
 *   1210     → "mil doscientos diez"
 *   1210.15  → "mil doscientos diez euros con quince céntimos"
 */

const UNIDADES = [
  '', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve',
  'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete',
  'dieciocho', 'diecinueve', 'veinte', 'veintiuno', 'veintidós', 'veintitrés',
  'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'
];

const DECENAS = [
  '', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'
];

const CENTENAS = [
  '', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos',
  'seiscientos', 'setecientos', 'ochocientos', 'novecientos'
];

function twoDigits(n: number): string {
  if (n < 30) return UNIDADES[n];
  const dec = Math.floor(n / 10);
  const unit = n % 10;
  if (unit === 0) return DECENAS[dec];
  return `${DECENAS[dec]} y ${UNIDADES[unit]}`;
}

function threeDigits(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'cien';
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const hundredPart = CENTENAS[hundreds];
  const restPart = twoDigits(rest);
  if (!hundredPart) return restPart;
  if (!restPart) return hundredPart;
  return `${hundredPart} ${restPart}`;
}

function thousandsBlock(n: number): string {
  // n < 1.000.000
  if (n === 0) return '';
  const thousands = Math.floor(n / 1000);
  const rest = n % 1000;
  let out = '';
  if (thousands > 0) {
    if (thousands === 1) {
      out = 'mil';
    } else {
      const pre = threeDigits(thousands).replace(/\buno\b/g, 'un');
      out = `${pre} mil`;
    }
  }
  const restPart = threeDigits(rest);
  if (restPart) out = out ? `${out} ${restPart}` : restPart;
  return out;
}

function millionsBlock(n: number): string {
  // n < 1.000.000.000
  if (n === 0) return 'cero';
  const millions = Math.floor(n / 1_000_000);
  const rest = n % 1_000_000;
  let out = '';
  if (millions > 0) {
    if (millions === 1) {
      out = 'un millón';
    } else {
      const pre = thousandsBlock(millions).replace(/\buno\b/g, 'un');
      out = `${pre} millones`;
    }
  }
  const restPart = thousandsBlock(rest);
  if (restPart) out = out ? `${out} ${restPart}` : restPart;
  return out;
}

/**
 * Convierte un número entero positivo a letras en español.
 */
export function numberToSpanishWords(n: number): string {
  const abs = Math.abs(Math.floor(n));
  if (abs === 0) return 'cero';
  if (abs >= 1_000_000_000) return String(abs); // fallback para muy grandes
  return millionsBlock(abs);
}

/**
 * Convierte un importe a letras en español con formato "X euros con Y céntimos".
 * Acepta número decimal. Redondea a 2 decimales.
 */
export function amountToSpanishWords(amount: number, currency: string = 'euro'): string {
  const rounded = Math.round(amount * 100) / 100;
  const integer = Math.floor(rounded);
  const cents = Math.round((rounded - integer) * 100);

  const integerWords = numberToSpanishWords(integer);
  const currencyWord = integer === 1 ? currency : `${currency}s`;

  let result = `${integerWords} ${currencyWord}`;

  if (cents > 0) {
    const centWords = numberToSpanishWords(cents);
    const centWord = cents === 1 ? 'céntimo' : 'céntimos';
    result += ` con ${centWords} ${centWord}`;
  }

  return result;
}
