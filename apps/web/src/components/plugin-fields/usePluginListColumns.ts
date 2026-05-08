import React from 'react';
import type { TableColumn } from '@openfactu/ui';
import { usePluginFields } from './usePluginFields';
import { PluginFieldValue } from './PluginFieldValue';

interface Fmt {
  money: (v: number | string | null | undefined) => string;
  number: (v: number | string | null | undefined, precision?: number) => string;
  date: (v: string | Date | null | undefined) => string;
}

interface Options {
  fmt?: Fmt;
  /** Si se pasa, se fuerza ese width en cada columna; si no, auto. */
  width?: string;
  /** Max-width CSS del contenido de cada celda (con ellipsis si se pasa). */
  cellMaxWidth?: string;
}

/**
 * Devuelve las `TableColumn[]` correspondientes a los campos plugin/usuario
 * marcados `showInList=true` para `tableName`. Spread al final del array
 * de columnas del listado.
 *
 * Diseño: no fijamos `width` por columna para que muchas columnas no revienten
 * el 100% del layout. Cada celda trunca su contenido con `max-w-[180px]` para
 * no empujar el ancho, y el contenedor exterior debe tener `overflow-x-auto`.
 */
export function usePluginListColumns(tableName: string, opts: Options = {}): TableColumn<any>[] {
  // 1) Preferimos los marcados `showInList`. Si ninguno lo está, caemos a
  //    TODOS los campos de la tabla — así el admin ve algo sin tener que
  //    editar cada campo explícitamente. `visibleIn` se usa solo para
  //    form/detail/pdf.
  const all = usePluginFields(tableName);
  const flagged = all.filter((f) => f.showInList);
  const fields = flagged.length > 0 ? flagged : all;
  const maxW = opts.cellMaxWidth || '180px';
  return fields.map((f) => ({
    header: f.label,
    ...(opts.width ? { width: opts.width } : {}),
    sortable:
      f.fieldType === 'TEXT' ||
      f.fieldType === 'INTEGER' ||
      f.fieldType === 'DECIMAL' ||
      f.fieldType === 'CURRENCY' ||
      f.fieldType === 'PERCENT' ||
      f.fieldType === 'DATE' ||
      f.fieldType === 'ENUM',
    sortAccessor: (item: any) => item?.[f.fieldName] ?? '',
    cell: (item: any) =>
      React.createElement(
        'div',
        {
          className: 'truncate',
          style: { maxWidth: maxW },
          title:
            typeof item?.[f.fieldName] === 'string' || typeof item?.[f.fieldName] === 'number'
              ? String(item[f.fieldName])
              : undefined,
        },
        React.createElement(PluginFieldValue, {
          def: f,
          value: item?.[f.fieldName],
          fmt: opts.fmt,
        }),
      ),
  }));
}
