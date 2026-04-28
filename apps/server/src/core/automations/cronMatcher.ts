/**
 * Matcher mínimo de expresiones cron de 5 campos:
 *   minute hour dayOfMonth month dayOfWeek
 *
 * Soporta:
 *   `*`          cualquier valor
 *   `n`          valor exacto
 *   `n,m,o`      lista
 *   `n-m`        rango
 *   `* /n`       cada n (sin el espacio)
 *
 * No soporta nombres de mes/día ni sintaxis extendida.
 */
function parseField(spec: string, min: number, max: number): (v: number) => boolean {
  if (spec === '*') return () => true;
  const parts = spec.split(',');
  const predicates: Array<(v: number) => boolean> = [];
  for (const part of parts) {
    if (part.includes('/')) {
      const [base, stepStr] = part.split('/');
      const step = Number(stepStr);
      if (!Number.isFinite(step) || step <= 0) continue;
      const [rangeFrom, rangeTo] =
        base === '*'
          ? [min, max]
          : base.includes('-')
            ? base.split('-').map(Number)
            : [Number(base), max];
      predicates.push((v) => v >= rangeFrom && v <= rangeTo && (v - rangeFrom) % step === 0);
      continue;
    }
    if (part.includes('-')) {
      const [from, to] = part.split('-').map(Number);
      predicates.push((v) => v >= from && v <= to);
      continue;
    }
    const n = Number(part);
    if (Number.isFinite(n)) predicates.push((v) => v === n);
  }
  return (v) => predicates.some((p) => p(v));
}

export function matchesCron(expr: string, date: Date = new Date()): boolean {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  const [m, h, dom, mon, dow] = parts;
  const minutes = parseField(m, 0, 59);
  const hours = parseField(h, 0, 23);
  const domP = parseField(dom, 1, 31);
  const monP = parseField(mon, 1, 12);
  const dowP = parseField(dow, 0, 6);
  return (
    minutes(date.getMinutes()) &&
    hours(date.getHours()) &&
    domP(date.getDate()) &&
    monP(date.getMonth() + 1) &&
    dowP(date.getDay())
  );
}
