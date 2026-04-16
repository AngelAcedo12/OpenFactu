/**
 * Códigos de tipo de documento unificados para todo el monorepo.
 *
 * Usar estos valores en vez de strings sueltos — hace que TypeScript pille
 * al vuelo errores como `'SNV'` en vez de `'SINV'`, y permite refactorizar
 * de forma segura si algún día cambian los códigos.
 */

// --- Códigos exactos que usan API y BD ---
export const DocType = {
  SalesOrder: 'SO',
  SalesDeliveryNote: 'SDN',
  SalesInvoice: 'SINV',
  PurchaseOrder: 'PO',
  PurchaseDeliveryNote: 'PDN',
  PurchaseInvoice: 'PINV',
} as const;
export type DocType = (typeof DocType)[keyof typeof DocType];

export const ALL_DOC_TYPES: readonly DocType[] = [
  DocType.SalesOrder,
  DocType.SalesDeliveryNote,
  DocType.SalesInvoice,
  DocType.PurchaseOrder,
  DocType.PurchaseDeliveryNote,
  DocType.PurchaseInvoice,
];

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  SO: 'Pedido Venta',
  SDN: 'Albarán Venta',
  SINV: 'Factura Venta',
  PO: 'Pedido Compra',
  PDN: 'Albarán Compra',
  PINV: 'Factura Compra',
};

export const DOC_TYPE_BREADCRUMBS: Record<DocType, string> = {
  SO: 'VENTAS · PEDIDO',
  SDN: 'VENTAS · ALBARÁN',
  SINV: 'VENTAS · FACTURA',
  PO: 'COMPRAS · PEDIDO',
  PDN: 'COMPRAS · ALBARÁN',
  PINV: 'COMPRAS · FACTURA',
};

// --- Categorías ortogonales ---

export const DocKind = {
  Order: 'order',
  DeliveryNote: 'deliveryNote',
  Invoice: 'invoice',
} as const;
export type DocKind = (typeof DocKind)[keyof typeof DocKind];

export const DocSide = {
  Sale: 'sale',
  Purchase: 'purchase',
} as const;
export type DocSide = (typeof DocSide)[keyof typeof DocSide];

export function decomposeDocType(dt: DocType): { kind: DocKind; side: DocSide } {
  switch (dt) {
    case 'SO':
      return { kind: 'order', side: 'sale' };
    case 'SDN':
      return { kind: 'deliveryNote', side: 'sale' };
    case 'SINV':
      return { kind: 'invoice', side: 'sale' };
    case 'PO':
      return { kind: 'order', side: 'purchase' };
    case 'PDN':
      return { kind: 'deliveryNote', side: 'purchase' };
    case 'PINV':
      return { kind: 'invoice', side: 'purchase' };
  }
}

export function composeDocType(kind: DocKind, side: DocSide): DocType {
  if (kind === 'order') return side === 'sale' ? 'SO' : 'PO';
  if (kind === 'deliveryNote') return side === 'sale' ? 'SDN' : 'PDN';
  return side === 'sale' ? 'SINV' : 'PINV';
}

export function isSaleDoc(dt: DocType): boolean {
  return dt === 'SO' || dt === 'SDN' || dt === 'SINV';
}

export function isPurchaseDoc(dt: DocType): boolean {
  return dt === 'PO' || dt === 'PDN' || dt === 'PINV';
}

// --- Estados de documento ---

export const DocStatus = {
  Open: 'O', // Abierto / Asentado
  Partial: 'P', // Parcialmente entregado/recibido
  Closed: 'C', // Cerrado / Facturado
  Cancelled: 'X', // Cancelado
} as const;
export type DocStatus = (typeof DocStatus)[keyof typeof DocStatus];

// --- Rutas del frontend por tipo ---

export const DOC_TYPE_ROUTES: Record<DocType, string> = {
  SO: '/sales-orders',
  SDN: '/sales/delivery-notes',
  SINV: '/sales/invoices',
  PO: '/purchase-orders',
  PDN: '/purchases/delivery-notes',
  PINV: '/purchases/invoices',
};

// --- Endpoints de API por tipo ---

export const DOC_TYPE_API_ENDPOINTS: Record<DocType, string> = {
  SO: '/api/sales',
  SDN: '/api/sales/delivery-notes',
  SINV: '/api/sales/invoices',
  PO: '/api/purchases/orders',
  PDN: '/api/purchases/delivery-notes',
  PINV: '/api/purchases/invoices',
};

// --- Gestión de trazabilidad del artículo ---

export const ItemTraceability = {
  None: 'N',
  Batch: 'B',
  Serial: 'S',
} as const;
export type ItemTraceability = (typeof ItemTraceability)[keyof typeof ItemTraceability];
