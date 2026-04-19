import type { DocType } from '../../utils/visualTemplateBuilder';

export type { DocType };

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  SINV: 'Factura de Venta',
  PINV: 'Factura de Compra',
  SDN: 'Albarán de Venta',
  PDN: 'Albarán de Compra',
  SO: 'Pedido de Venta',
  PO: 'Pedido de Compra',
};

export const DOC_TYPE_COLORS: Record<DocType, string> = {
  SINV: 'bg-amber-50 dark:bg-amber-900 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-600',
  PINV: 'bg-amber-50 dark:bg-amber-900 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-600',
  SDN: 'bg-emerald-50 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-600',
  PDN: 'bg-emerald-50 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-600',
  SO: 'bg-indigo-50 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-600',
  PO: 'bg-indigo-50 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-600',
};

export const DOC_TYPE_OPTIONS = (Object.keys(DOC_TYPE_LABELS) as DocType[]).map((v) => ({
  label: DOC_TYPE_LABELS[v],
  value: v,
}));

export interface TemplateRow {
  id: string;
  docType: DocType;
  name: string;
  isDefault: boolean;
  updatedAt?: string;
  html?: string;
  canvasLayout?: unknown;
  layoutVersion?: number;
  legacyHtml?: boolean;
}
