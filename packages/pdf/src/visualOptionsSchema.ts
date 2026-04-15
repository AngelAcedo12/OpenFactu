import type { DocType } from './types';

export type FontFamily = 'sans' | 'serif' | 'mono';
export type PageSize = 'A4' | 'Letter' | 'A5';
export type PageOrientation = 'portrait' | 'landscape';
export type MarginPreset = 'narrow' | 'normal' | 'wide';
export type LogoPosition = 'left' | 'center' | 'right';
export type TextAlignment = 'left' | 'center' | 'right';

export interface WatermarkOptions {
  enabled: boolean;
  text: string;
  color: string;
  opacity: number;    // 0..1
  rotation: number;   // degrees
  fontSize: number;   // px
}

export interface FooterOptions {
  text: string;
  alignment: TextAlignment;
  showPageNumbers: boolean;
  showGeneratedAt: boolean;
}

export interface ColumnVisibility {
  code: boolean;
  description: boolean;
  quantity: boolean;
  uom: boolean;
  price: boolean;
  iva: boolean;
  lineTotal: boolean;
}

export interface VisualOptions {
  // Colores
  accentColor: string;
  headerBgColor: string;
  textColor: string;
  mutedColor: string;

  // Tipografía
  fontFamily: FontFamily;
  baseFontSize: number;

  // Página
  pageSize: PageSize;
  orientation: PageOrientation;
  margins: MarginPreset;

  // Cabecera / identidad
  logoUrl: string;
  logoPosition: LogoPosition;
  logoMaxHeight: number;
  customTitle: string;

  // Bloques de empresa (visibilidad)
  showCompanyTaxId: boolean;
  showCompanyAddress: boolean;
  showCompanyContact: boolean;

  // Bloques de cliente/proveedor (visibilidad)
  showPartnerTaxId: boolean;
  showPartnerAddress: boolean;
  showPartnerContact: boolean;
  showShipTo: boolean;
  showBillTo: boolean;
  showBaseDoc: boolean;
  showTaxBreakdown: boolean;
  showTotalInWords: boolean;

  // Columnas de la tabla
  columns: ColumnVisibility;

  // Marca de agua
  watermark: WatermarkOptions;

  // Pie de página
  footer: FooterOptions;

  // Escape hatch
  customCss: string;
}

export const DEFAULT_VISUAL_OPTIONS: VisualOptions = {
  accentColor: '#f59e0b',
  headerBgColor: '#0f172a',
  textColor: '#1e293b',
  mutedColor: '#64748b',

  fontFamily: 'sans',
  baseFontSize: 10,

  pageSize: 'A4',
  orientation: 'portrait',
  margins: 'normal',

  logoUrl: '',
  logoPosition: 'left',
  logoMaxHeight: 60,
  customTitle: '',

  showCompanyTaxId: true,
  showCompanyAddress: true,
  showCompanyContact: true,

  showPartnerTaxId: true,
  showPartnerAddress: true,
  showPartnerContact: false,
  showShipTo: true,
  showBillTo: false,
  showBaseDoc: true,
  showTaxBreakdown: true,
  showTotalInWords: false,

  columns: {
    code: true,
    description: true,
    quantity: true,
    uom: true,
    price: true,
    iva: true,
    lineTotal: true
  },

  watermark: {
    enabled: false,
    text: 'BORRADOR',
    color: '#cbd5e1',
    opacity: 0.25,
    rotation: -30,
    fontSize: 120
  },

  footer: {
    text: 'Documento generado electrónicamente · {{company.name}}',
    alignment: 'center',
    showPageNumbers: false,
    showGeneratedAt: false
  },

  customCss: ''
};

// ============================================================================
// FIELD SCHEMA — usado por el FieldExplorer del frontend
// ============================================================================

export type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';

export interface FieldDef {
  path: string;
  type: FieldType;
  description: string;
  example?: string;
}

export interface FieldGroup {
  group: 'doc' | 'partner' | 'company' | 'lines' | 'generatedAt';
  label: string;
  icon: 'FileText' | 'Users' | 'Building2' | 'ListOrdered' | 'Clock';
  note?: string;
  fields: FieldDef[];
}

export const FIELD_SCHEMA: FieldGroup[] = [
  {
    group: 'doc',
    label: 'Documento',
    icon: 'FileText',
    fields: [
      { path: 'doc.docCode',        type: 'string', description: 'Código completo del documento', example: 'FAC-A-2026-000042' },
      { path: 'doc.date',           type: 'string', description: 'Fecha formateada (dd/mm/yyyy)', example: '14/04/2026' },
      { path: 'doc.status',         type: 'string', description: 'Código de estado', example: 'O' },
      { path: 'doc.statusLabel',    type: 'string', description: 'Estado legible', example: 'Abierto' },
      { path: 'doc.subtotal',       type: 'number', description: 'Base imponible', example: '1000.00' },
      { path: 'doc.taxTotal',       type: 'number', description: 'Total de IVA', example: '210.00' },
      { path: 'doc.total',          type: 'number', description: 'Total del documento', example: '1210.00' },
      { path: 'doc.totalInWords',   type: 'string', description: 'Total en letras (español)', example: 'mil doscientos diez euros' },
      { path: 'doc.billToAddress',  type: 'string', description: 'Dirección de facturación (texto libre)' },
      { path: 'doc.shipToAddress',  type: 'string', description: 'Dirección de envío (texto libre)' },
      { path: 'doc.baseDocCode',    type: 'string', description: 'Código del documento origen (albarán facturado), null si no aplica' },
      { path: 'doc.taxBreakdown',   type: 'array',  description: 'Desglose de IVA. Usar #each con .rate, .base, .tax' }
    ]
  },
  {
    group: 'partner',
    label: 'Cliente / Proveedor',
    icon: 'Users',
    fields: [
      { path: 'partner.name',             type: 'string', description: 'Nombre fiscal' },
      { path: 'partner.foreignName',      type: 'string', description: 'Nombre extranjero / alias' },
      { path: 'partner.taxId',            type: 'string', description: 'NIF / CIF / VAT' },
      { path: 'partner.email',            type: 'string', description: 'Email de contacto' },
      { path: 'partner.phone',            type: 'string', description: 'Teléfono' },
      { path: 'partner.website',          type: 'string', description: 'Web' },
      { path: 'partner.address',          type: 'string', description: 'Dirección principal formateada' },
      { path: 'partner.billingAddress',   type: 'object', description: 'Dirección de facturación: .street, .city, .state, .zipCode, .country' },
      { path: 'partner.shippingAddress',  type: 'object', description: 'Dirección de envío: .street, .city, .state, .zipCode, .country' },
      { path: 'partner.priceListName',    type: 'string', description: 'Nombre de la tarifa asociada' }
    ]
  },
  {
    group: 'company',
    label: 'Empresa (emisor)',
    icon: 'Building2',
    fields: [
      { path: 'company.name',     type: 'string', description: 'Nombre legal de la empresa' },
      { path: 'company.taxId',    type: 'string', description: 'CIF / VAT de la empresa' },
      { path: 'company.address',  type: 'string', description: 'Dirección de la empresa' },
      { path: 'company.phone',    type: 'string', description: 'Teléfono' },
      { path: 'company.email',    type: 'string', description: 'Email' },
      { path: 'company.website',  type: 'string', description: 'Web' },
      { path: 'company.logoUrl',  type: 'string', description: 'URL del logo' }
    ]
  },
  {
    group: 'lines',
    label: 'Líneas del documento',
    icon: 'ListOrdered',
    note: 'Envolver en {{#each lines}} ... {{/each}}. Dentro del bucle, usar los campos sin prefijo.',
    fields: [
      { path: 'lineNum',         type: 'number', description: 'Número de línea (1-indexado)' },
      { path: 'itemCode',        type: 'string', description: 'Código del artículo' },
      { path: 'itemName',        type: 'string', description: 'Nombre del artículo' },
      { path: 'itemDescription', type: 'string', description: 'Descripción larga del artículo' },
      { path: 'quantity',        type: 'number', description: 'Cantidad' },
      { path: 'uom',             type: 'string', description: 'Unidad de medida (ej. "u", "kg")' },
      { path: 'price',           type: 'number', description: 'Precio unitario' },
      { path: 'taxRate',         type: 'number', description: 'Porcentaje de IVA' },
      { path: 'lineTotal',       type: 'number', description: 'Total de línea con IVA' },
      { path: 'category',        type: 'string', description: 'Nombre de la categoría del artículo' },
      { path: 'batches',         type: 'array',  description: 'Lotes/números de serie (array con .batchNum, .quantity)' }
    ]
  },
  {
    group: 'generatedAt',
    label: 'Generación',
    icon: 'Clock',
    fields: [
      { path: 'generatedAt', type: 'string', description: 'Fecha y hora de generación del PDF' }
    ]
  }
];

// Helpers de Handlebars disponibles (documentados para el explorer)
export interface HelperDef {
  name: string;
  usage: string;
  description: string;
}

export const HELPERS: HelperDef[] = [
  { name: 'formatCurrency', usage: '{{formatCurrency doc.total}}', description: 'Formatea un número como moneda (€)' },
  { name: 'formatNumber',   usage: '{{formatNumber quantity 2}}', description: 'Formatea un número con N decimales' },
  { name: 'formatDate',     usage: '{{formatDate doc.date}}', description: 'Formatea una fecha ISO a dd/mm/yyyy' },
  { name: 'padLeft',        usage: "{{padLeft doc.docNum 6 '0'}}", description: 'Rellena por la izquierda con un carácter' },
  { name: 'eq',             usage: '{{#if (eq doc.status "O")}}...{{/if}}', description: 'Comparación de igualdad' },
  { name: 'gt',             usage: '{{#if (gt doc.total 1000)}}...{{/if}}', description: 'Mayor que' }
];

// Tipos de documento para convenience del frontend
export const DOC_TYPE_DEFAULT_TITLES: Record<DocType, string> = {
  SINV: 'Factura de Venta',
  PINV: 'Factura de Compra',
  SDN:  'Albarán de Venta',
  PDN:  'Albarán de Compra',
  SO:   'Pedido de Venta',
  PO:   'Pedido de Compra'
};

export const DOC_TYPE_PARTNER_LABELS: Record<DocType, string> = {
  SINV: 'Cliente',
  PINV: 'Proveedor',
  SDN:  'Cliente',
  PDN:  'Proveedor',
  SO:   'Cliente',
  PO:   'Proveedor'
};
