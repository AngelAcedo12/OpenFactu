/**
 * Modelo del layout tipo canvas para plantillas de documento.
 *
 * Se persiste en DocumentTemplate.canvasLayout (JSONB). El compilador
 * canvas→HTML lo lee y genera la columna `html` existente, que sigue
 * alimentando al renderizador PDF.
 *
 * Todas las dimensiones (mm para bandas y márgenes, puntos proporcionales
 * al ancho de la banda para elementos) se normalizan dentro del módulo del
 * compilador. Los tipos aquí son el contrato de datos, no de presentación.
 */

export type LayoutVersion = 1;

export type PageSize = 'A4' | 'Letter';

export interface Margins {
  /** mm */
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export type BandKind = 'pageHeader' | 'docHeader' | 'detail' | 'totals' | 'pageFooter';

export interface Band {
  id: string;
  kind: BandKind;
  /** Alto de la banda en mm. */
  height: number;
  elements: CanvasElement[];
}

/** Estilo común que puede aplicar cualquier elemento. */
export interface ElementStyle {
  fontFamily?: string;
  /** pt */
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  color?: string;
  backgroundColor?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  borderWidth?: number;
  borderColor?: string;
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'none';
  /** px */
  padding?: number;
}

/** Base compartida por todos los elementos. Coordenadas en mm respecto al origen de la banda. */
export interface BaseElement {
  id: string;
  x: number;
  y: number;
  /** Ancho en mm. */
  w: number;
  /** Alto en mm. */
  h: number;
  style?: ElementStyle;
}

/** Texto fijo. */
export interface TextElement extends BaseElement {
  kind: 'text';
  text: string;
}

/** Imagen por URL o data URI. */
export interface ImageElement extends BaseElement {
  kind: 'image';
  src: string;
  fit?: 'contain' | 'cover' | 'fill';
}

/** Separadores decorativos (línea o rectángulo). */
export interface ShapeElement extends BaseElement {
  kind: 'shape';
  shape: 'line' | 'rect';
}

/** Hueco vertical para espaciar. Sin render visible. */
export interface SpacerElement extends BaseElement {
  kind: 'spacer';
}

/**
 * Campo vinculado a datos. `path` es una expresión tipo "document.number",
 * "customer.address.city", "totals.subtotal"… El compilador la traduce a
 * Handlebars (`{{document.number}}`).
 *
 * `format` es opcional: "currency" | "date" | "number" | "percent" — por
 * ahora se mapean a helpers existentes del paquete @openfactu/pdf.
 */
export interface FieldElement extends BaseElement {
  kind: 'field';
  path: string;
  format?: 'currency' | 'date' | 'number' | 'percent';
  /** Literal a anteponer ("Nº Factura: "). */
  prefix?: string;
  /** Literal a añadir al final. */
  suffix?: string;
}

/** Columna de la tabla de líneas. `path` es relativo al contexto de línea. */
export interface LinesTableColumn {
  id: string;
  /** Cabecera visible. */
  label: string;
  /** Expresión relativa a cada línea (p.ej. "item.name", "quantity", "lineTotal"). */
  path: string;
  /** Ancho proporcional (suma de todas las columnas = 100). */
  widthPct: number;
  /** Alineación del contenido. */
  align?: 'left' | 'center' | 'right';
  format?: FieldElement['format'];
}

/**
 * Tabla de líneas. Solo tiene sentido dentro de la banda `detail`. El
 * compilador la expande en un `{{#each lines}}`.
 */
export interface LinesTableElement extends BaseElement {
  kind: 'linesTable';
  columns: LinesTableColumn[];
  /** Muestra o no la fila de cabecera. */
  showHeader?: boolean;
}

/**
 * Bloque de totales. El compilador decide qué totales renderizar (subtotal,
 * desglose de impuestos, total). `fields` permite ocultar partes si se quiere.
 */
export interface TotalsElement extends BaseElement {
  kind: 'totals';
  showSubtotal?: boolean;
  showTaxBreakdown?: boolean;
  showTotal?: boolean;
}

/** Código QR. `value` es una expresión tipo campo (p.ej. "verifactu.qrPayload"). */
export interface QRElement extends BaseElement {
  kind: 'qr';
  value: string;
  /** Pixeles por módulo. Por defecto 4. */
  scale?: number;
}

/** Código de barras lineal. */
export interface BarcodeElement extends BaseElement {
  kind: 'barcode';
  value: string;
  symbology: 'code128' | 'ean13' | 'ean8' | 'code39';
  /** Muestra el texto legible bajo el código. */
  includeText?: boolean;
}

export type CanvasElement =
  | TextElement
  | ImageElement
  | ShapeElement
  | SpacerElement
  | FieldElement
  | LinesTableElement
  | TotalsElement
  | QRElement
  | BarcodeElement;

export type ElementKind = CanvasElement['kind'];

/** Raíz del layout persistido. */
export interface CanvasLayout {
  version: LayoutVersion;
  pageSize: PageSize;
  margins: Margins;
  bands: Band[];
}

/** Layout inicial vacío para una plantilla recién creada. */
export function createEmptyLayout(): CanvasLayout {
  return {
    version: 1,
    pageSize: 'A4',
    margins: { top: 15, right: 15, bottom: 15, left: 15 },
    bands: [
      { id: 'b_pageHeader', kind: 'pageHeader', height: 20, elements: [] },
      { id: 'b_docHeader', kind: 'docHeader', height: 40, elements: [] },
      { id: 'b_detail', kind: 'detail', height: 100, elements: [] },
      { id: 'b_totals', kind: 'totals', height: 30, elements: [] },
      { id: 'b_pageFooter', kind: 'pageFooter', height: 15, elements: [] },
    ],
  };
}
