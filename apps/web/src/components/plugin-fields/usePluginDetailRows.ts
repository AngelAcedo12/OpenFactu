import React from 'react';
import { usePluginFields } from './usePluginFields';
import { PluginFieldValue } from './PluginFieldValue';
import type { PluginFieldDef } from './types';

interface Fmt {
  money: (v: number | string | null | undefined) => string;
  number: (v: number | string | null | undefined, precision?: number) => string;
  date: (v: string | Date | null | undefined) => string;
}

interface DetailRow {
  def: PluginFieldDef;
  label: string;
  fieldName: string;
  section: string | null;
  width: 'full' | 'half' | 'third';
  render: React.ReactNode;
}

/** Devuelve filas listas para renderizar en una vista de detalle.
 *  Útil cuando quieres pintar el doc como "label: valor" respetando
 *  las secciones y anchuras definidas.
 *
 *    const rows = usePluginDetailRows('SalesInvoice', invoice, { fmt });
 *    rows.map(r => <div>{r.label}: {r.render}</div>)
 */
export function usePluginDetailRows(
  tableName: string,
  row: Record<string, any> | null | undefined,
  opts: { fmt?: Fmt } = {},
): DetailRow[] {
  const fields = usePluginFields(tableName, { surface: 'detail' });
  if (!row) return [];
  return fields.map((f) => ({
    def: f,
    label: f.label,
    fieldName: f.fieldName,
    section: f.section ?? null,
    width: f.width || 'half',
    render: React.createElement(PluginFieldValue, {
      def: f,
      value: row[f.fieldName],
      fmt: opts.fmt,
    }),
  }));
}
