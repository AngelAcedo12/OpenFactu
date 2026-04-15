export interface FormatConfig {
  locale: string;
  dateFormat: string;
  decimalPrecision: number;
  quantityPrecision: number;
}

export const FORMAT_DEFAULTS: FormatConfig = {
  locale: 'es-ES',
  dateFormat: 'dd/MM/yyyy',
  decimalPrecision: 2,
  quantityPrecision: 2,
};

/**
 * Formatea un importe con el locale y la precisión decimal configurados.
 */
export function formatCurrency(
  value: number | string | null | undefined,
  fmt: FormatConfig = FORMAT_DEFAULTS,
  currency = 'EUR',
): string {
  const n = Number(value) || 0;
  try {
    return new Intl.NumberFormat(fmt.locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: fmt.decimalPrecision,
      maximumFractionDigits: fmt.decimalPrecision,
    }).format(n);
  } catch {
    return n.toFixed(fmt.decimalPrecision) + ' ' + currency;
  }
}

/**
 * Formatea un número con el locale configurado y precisión opcional.
 * Si no se pasa precisión usa decimalPrecision por defecto.
 */
export function formatNumber(
  value: number | string | null | undefined,
  fmt: FormatConfig = FORMAT_DEFAULTS,
  precision?: number,
): string {
  const n = Number(value) || 0;
  const p = precision ?? fmt.decimalPrecision;
  try {
    return new Intl.NumberFormat(fmt.locale, {
      minimumFractionDigits: p,
      maximumFractionDigits: p,
    }).format(n);
  } catch {
    return n.toFixed(p);
  }
}

/**
 * Formatea cantidades (stock, unidades) usando quantityPrecision.
 */
export function formatQuantity(
  value: number | string | null | undefined,
  fmt: FormatConfig = FORMAT_DEFAULTS,
): string {
  return formatNumber(value, fmt, fmt.quantityPrecision);
}

/**
 * Formatea una fecha con el patrón configurado (dd/MM/yyyy, yyyy-MM-dd, MM/dd/yyyy).
 */
export function formatDate(
  value: Date | string | null | undefined,
  fmt: FormatConfig = FORMAT_DEFAULTS,
): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return '';

  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = String(d.getFullYear());

  switch (fmt.dateFormat) {
    case 'yyyy-MM-dd':
      return `${yyyy}-${mm}-${dd}`;
    case 'MM/dd/yyyy':
      return `${mm}/${dd}/${yyyy}`;
    case 'dd-MM-yyyy':
      return `${dd}-${mm}-${yyyy}`;
    default:
      return `${dd}/${mm}/${yyyy}`;
  }
}
