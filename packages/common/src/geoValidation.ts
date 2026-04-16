/**
 * Helpers de validación y formato geográficos por país.
 * Puros, sin dependencias React — usables tanto en frontend como en backend.
 */

export interface CountryMeta {
  code: string;
  taxIdRegex?: string;
  taxIdLabel?: string;
  taxIdExample?: string;
  postalCodeRegex?: string;
  postalCodeLabel?: string;
  phonePrefix?: string;
  name?: string;
}

/**
 * Valida un NIF/CIF/TIN contra el regex del país. Si el país no tiene regex
 * o el país es desconocido, devuelve `true` (permisivo).
 */
export function validateTaxId(
  taxId: string | null | undefined,
  country?: CountryMeta | null,
): boolean {
  if (!taxId) return false;
  if (!country?.taxIdRegex) return true;
  try {
    return new RegExp(country.taxIdRegex, 'i').test(taxId.trim());
  } catch {
    return true;
  }
}

/**
 * Valida un código postal contra el regex del país.
 */
export function validatePostalCode(
  code: string | null | undefined,
  country?: CountryMeta | null,
): boolean {
  if (!code) return false;
  if (!country?.postalCodeRegex) return true;
  try {
    return new RegExp(country.postalCodeRegex, 'i').test(code.trim());
  } catch {
    return true;
  }
}

/**
 * Normaliza un número de teléfono con el prefijo del país activo.
 * - Si ya empieza por `+`, lo deja tal cual.
 * - Si empieza por `00`, reemplaza por `+`.
 * - Si no, prefija con country.phonePrefix.
 */
export function normalizePhone(
  phone: string | null | undefined,
  country?: CountryMeta | null,
): string {
  if (!phone) return '';
  const clean = phone.trim().replace(/\s+/g, ' ');
  if (clean.startsWith('+')) return clean;
  if (clean.startsWith('00')) return '+' + clean.slice(2);
  if (country?.phonePrefix) {
    // Si el usuario metió el prefijo sin el +, respetamos
    const digitsPrefix = country.phonePrefix.replace('+', '');
    if (clean.startsWith(digitsPrefix)) return '+' + clean;
    return `${country.phonePrefix} ${clean}`;
  }
  return clean;
}

/**
 * Extrae solo los dígitos del teléfono (sin prefijo) para edición.
 */
export function stripPhonePrefix(
  phone: string | null | undefined,
  country?: CountryMeta | null,
): string {
  if (!phone) return '';
  let clean = phone.trim();
  if (country?.phonePrefix && clean.startsWith(country.phonePrefix)) {
    clean = clean.slice(country.phonePrefix.length).trim();
  } else if (clean.startsWith('+')) {
    // remover cualquier prefijo +NN
    clean = clean.replace(/^\+\d{1,4}\s*/, '');
  }
  return clean;
}
