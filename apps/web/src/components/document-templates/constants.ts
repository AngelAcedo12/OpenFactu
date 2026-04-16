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
  SINV: 'bg-amber-50 text-amber-700 border-amber-200',
  PINV: 'bg-amber-50 text-amber-700 border-amber-200',
  SDN: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PDN: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  SO: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  PO: 'bg-indigo-50 text-indigo-700 border-indigo-200',
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
}
