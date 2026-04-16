import * as React from 'react';
import { cn } from '../utils';

export interface TableColumn<T> {
  header: string;
  accessor?: keyof T | ((item: T, index: number) => React.ReactNode);
  cell?: (item: T, index: number) => React.ReactNode; // Explicit support for custom cell rendering
  align?: 'left' | 'center' | 'right';
  className?: string;
  width?: string;
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  className?: string;
  emptyMessage?: string;
  isLoading?: boolean;
}

export function Table<T>({
  columns,
  data = [],
  onRowClick,
  className,
  emptyMessage = 'No se encontraron registros.',
  isLoading,
}: TableProps<T>) {
  return (
    <div className={cn('w-full overflow-auto bg-white dark:bg-slate-900', className)}>
      <table className="w-full text-[13px] leading-tight text-left border-collapse font-sans min-w-full">
        <thead className="bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
          <tr>
            {columns.map((col, idx) => (
              <th
                key={idx}
                style={{ width: col.width }}
                className={cn(
                  'px-4 py-3 font-bold uppercase tracking-tight text-[10px] text-slate-500 dark:text-slate-400 font-display whitespace-nowrap',
                  col.align === 'center'
                    ? 'text-center'
                    : col.align === 'right'
                      ? 'text-right'
                      : 'text-left',
                  col.className,
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {isLoading ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-10 text-center text-slate-400 dark:text-slate-500 font-medium"
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                  <span className="animate-pulse">Sincronizando con el servidor...</span>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-16 text-center text-slate-400 dark:text-slate-500"
              >
                <div className="flex flex-col items-center gap-2 opacity-50">
                  <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                    />
                  </svg>
                  <span className="text-xs font-semibold uppercase tracking-widest">
                    {emptyMessage}
                  </span>
                </div>
              </td>
            </tr>
          ) : (
            data.map((item, rowIdx) => (
              <tr
                key={rowIdx}
                onClick={() => onRowClick?.(item)}
                className={cn(
                  'group transition-all duration-75',
                  rowIdx % 2 === 0
                    ? 'bg-white dark:bg-slate-900'
                    : 'bg-slate-50/50 dark:bg-slate-950/30',
                  onRowClick
                    ? 'cursor-pointer hover:bg-primary/5'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50',
                )}
              >
                {columns.map((col, colIdx) => {
                  let content: React.ReactNode = null;
                  if (col.cell) {
                    content = col.cell(item, rowIdx);
                  } else if (typeof col.accessor === 'function') {
                    content = col.accessor(item, rowIdx);
                  } else if (col.accessor) {
                    content = item[col.accessor] as React.ReactNode;
                  }

                  return (
                    <td
                      key={colIdx}
                      className={cn(
                        'px-4 py-3 text-slate-600 dark:text-slate-300 font-medium group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors',
                        col.align === 'center'
                          ? 'text-center'
                          : col.align === 'right'
                            ? 'text-right'
                            : 'text-left',
                        col.className,
                      )}
                    >
                      {content}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
