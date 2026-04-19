/**
 * Compilador CanvasLayout → HTML + Handlebars.
 *
 * La salida es una plantilla HTML completa, compatible con el pipeline actual
 * de @openfactu/pdf (que espera HTML con expresiones Handlebars sobre el
 * DocumentPdfPayload estándar: `doc`, `company`, `partner`, `lines`...).
 *
 * El compilador es puro (string in → string out). No depende del DOM, de
 * React ni de acceso a red — testeable con snapshots.
 *
 * Notas de alcance (MVP):
 * - Las bandas se emiten linealmente (pageHeader, docHeader, detail, totals,
 *   pageFooter). El docHeader/detail/totals/pageFooter aparecen una sola vez.
 *   Puppeteer pagina automáticamente el contenido. Repetición estricta de
 *   pageHeader/pageFooter por página queda fuera de esta fase.
 * - QR y barcode emiten llamadas a helpers Handlebars `qrCode` y `barcode`
 *   que aún no existen en @openfactu/pdf. Hasta que se añadan allí, esos
 *   elementos renderizan vacío. No rompen el pipeline.
 */

import type {
  CanvasLayout,
  Band,
  CanvasElement,
  ElementStyle,
  LinesTableElement,
  TotalsElement,
  FieldElement,
  TextElement,
  ImageElement,
  ShapeElement,
  QRElement,
  BarcodeElement,
  LinesTableColumn,
} from './types';

export interface CompileOptions {
  /** Código del tipo de documento (SINV, PINV, ...). Se inyecta en el title. */
  docType?: string;
  /** CSS adicional para casos avanzados (normalmente no hace falta). */
  extraCss?: string;
}

export function compileCanvas(layout: CanvasLayout, options: CompileOptions = {}): string {
  const { docType = '', extraCss = '' } = options;

  const pageCss = buildPageCss(layout);
  const bodyHtml = layout.bands.map((b) => renderBand(b)).join('\n');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(docType)} {{doc.docCode}}</title>
<style>
${pageCss}
${BASE_CSS}
${extraCss}
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

// ---------- bandas y elementos ----------

function renderBand(band: Band): string {
  const inner = band.elements.map((el) => renderElement(el)).join('\n');
  return `<section class="band band-${band.kind}" data-band="${band.kind}" style="height:${band.height}mm;">
${inner}
</section>`;
}

function renderElement(el: CanvasElement): string {
  switch (el.kind) {
    case 'text':
      return renderText(el);
    case 'image':
      return renderImage(el);
    case 'shape':
      return renderShape(el);
    case 'spacer':
      return renderSpacer(el);
    case 'field':
      return renderField(el);
    case 'linesTable':
      return renderLinesTable(el);
    case 'totals':
      return renderTotals(el);
    case 'qr':
      return renderQR(el);
    case 'barcode':
      return renderBarcode(el);
  }
}

function renderText(el: TextElement): string {
  return `<div class="el el-text" style="${positionStyle(el)}${styleToCss(el.style)}">${escapeHtml(el.text)}</div>`;
}

function renderImage(el: ImageElement): string {
  const fit = el.fit ?? 'contain';
  return `<div class="el el-image" style="${positionStyle(el)}">
<img src="${escapeAttr(el.src)}" style="width:100%;height:100%;object-fit:${fit};" />
</div>`;
}

function renderShape(el: ShapeElement): string {
  const style = el.style ?? {};
  const borderColor = style.borderColor ?? '#000';
  const borderWidth = style.borderWidth ?? 1;
  if (el.shape === 'line') {
    return `<div class="el el-shape" style="${positionStyle(el)}border-top:${borderWidth}px ${style.borderStyle ?? 'solid'} ${borderColor};"></div>`;
  }
  return `<div class="el el-shape" style="${positionStyle(el)}border:${borderWidth}px ${style.borderStyle ?? 'solid'} ${borderColor};background:${style.backgroundColor ?? 'transparent'};"></div>`;
}

function renderSpacer(el: { id: string } & CanvasElement): string {
  return `<div class="el el-spacer" data-id="${el.id}" style="${positionStyle(el as any)}"></div>`;
}

function renderField(el: FieldElement): string {
  const expr = buildFieldExpression(el.path, el.format);
  const prefix = el.prefix ? escapeHtml(el.prefix) : '';
  const suffix = el.suffix ? escapeHtml(el.suffix) : '';
  return `<div class="el el-field" style="${positionStyle(el)}${styleToCss(el.style)}">${prefix}${expr}${suffix}</div>`;
}

function renderLinesTable(el: LinesTableElement): string {
  const cols = normalizeColumnWidths(el.columns);
  const header = el.showHeader === false
    ? ''
    : `<thead><tr>${cols
        .map(
          (c) =>
            `<th style="width:${c.widthPct}%;text-align:${c.align ?? 'left'};">${escapeHtml(c.label)}</th>`,
        )
        .join('')}</tr></thead>`;

  const bodyCells = cols
    .map(
      (c) =>
        `<td style="text-align:${c.align ?? 'left'};">${buildFieldExpression(c.path, c.format)}</td>`,
    )
    .join('');

  return `<div class="el el-linesTable" style="${positionStyle(el)}${styleToCss(el.style)}">
<table class="lines-table">
${header}
<tbody>
{{#each lines}}
<tr>${bodyCells}</tr>
{{/each}}
{{#unless lines.length}}
<tr><td colspan="${cols.length}" class="lines-empty">Sin líneas</td></tr>
{{/unless}}
</tbody>
</table>
</div>`;
}

function renderTotals(el: TotalsElement): string {
  const showSubtotal = el.showSubtotal !== false;
  const showTax = el.showTaxBreakdown !== false;
  const showTotal = el.showTotal !== false;

  const rows: string[] = [];
  if (showSubtotal) {
    rows.push(
      `<div class="totals-row"><span class="totals-label">Subtotal</span><span class="totals-value">{{formatCurrency doc.subtotal}}</span></div>`,
    );
  }
  if (showTax) {
    rows.push(
      `{{#each doc.taxBreakdown}}<div class="totals-row"><span class="totals-label">IVA {{rate}}%</span><span class="totals-value">{{formatCurrency amount}}</span></div>{{/each}}`,
    );
  }
  if (showTotal) {
    rows.push(
      `<div class="totals-row totals-row-grand"><span class="totals-label">Total</span><span class="totals-value">{{formatCurrency doc.total}}</span></div>`,
    );
  }

  return `<div class="el el-totals" style="${positionStyle(el)}${styleToCss(el.style)}">
${rows.join('\n')}
</div>`;
}

function renderQR(el: QRElement): string {
  const scale = el.scale ?? 4;
  // TODO(openfactu/pdf): registrar helper `qrCode` que devuelva data URI SVG.
  // Hasta entonces, esta expresión renderiza vacío (comportamiento por defecto de Handlebars).
  return `<div class="el el-qr" style="${positionStyle(el)}">
<img src="{{{qrCode ${asLiteralOrExpr(el.value)} scale=${scale}}}}" style="width:100%;height:100%;object-fit:contain;" />
</div>`;
}

function renderBarcode(el: BarcodeElement): string {
  // TODO(openfactu/pdf): registrar helper `barcode` que devuelva data URI SVG.
  return `<div class="el el-barcode" style="${positionStyle(el)}">
<img src="{{{barcode ${asLiteralOrExpr(el.value)} symbology="${el.symbology}" includeText=${el.includeText ? 'true' : 'false'}}}}" style="width:100%;height:100%;object-fit:contain;" />
</div>`;
}

// ---------- helpers de estilo ----------

function positionStyle(el: { x: number; y: number; w: number; h: number }): string {
  return `position:absolute;left:${el.x}mm;top:${el.y}mm;width:${el.w}mm;height:${el.h}mm;`;
}

function styleToCss(style?: ElementStyle): string {
  if (!style) return '';
  const parts: string[] = [];
  if (style.fontFamily) parts.push(`font-family:${style.fontFamily};`);
  if (style.fontSize != null) parts.push(`font-size:${style.fontSize}pt;`);
  if (style.fontWeight) parts.push(`font-weight:${style.fontWeight};`);
  if (style.fontStyle) parts.push(`font-style:${style.fontStyle};`);
  if (style.color) parts.push(`color:${style.color};`);
  if (style.backgroundColor) parts.push(`background-color:${style.backgroundColor};`);
  if (style.textAlign) parts.push(`text-align:${style.textAlign};`);
  if (style.padding != null) parts.push(`padding:${style.padding}px;`);
  if (style.borderWidth != null || style.borderStyle || style.borderColor) {
    parts.push(
      `border:${style.borderWidth ?? 1}px ${style.borderStyle ?? 'solid'} ${style.borderColor ?? '#000'};`,
    );
  }
  return parts.join('');
}

function buildPageCss(layout: CanvasLayout): string {
  const { top, right, bottom, left } = layout.margins;
  return `@page { size: ${layout.pageSize}; margin: ${top}mm ${right}mm ${bottom}mm ${left}mm; }
body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }`;
}

const BASE_CSS = `.band { position: relative; width: 100%; overflow: hidden; }
.el { box-sizing: border-box; overflow: hidden; }
.lines-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.lines-table th, .lines-table td { padding: 4px 6px; border-bottom: 1px solid #e5e7eb; font-size: 9pt; }
.lines-table th { background: #f1f5f9; font-weight: 600; }
.lines-empty { text-align: center; color: #94a3b8; font-style: italic; }
.totals-row { display: flex; justify-content: space-between; padding: 2px 0; font-size: 10pt; }
.totals-row-grand { border-top: 1px solid #000; font-weight: 700; font-size: 11pt; }`;

// ---------- helpers de expresión ----------

/**
 * Convierte un path como "doc.docCode" en `{{doc.docCode}}`. Si hay `format`,
 * envuelve con el helper correspondiente (que existe en @openfactu/pdf).
 */
function buildFieldExpression(path: string, format?: FieldElement['format']): string {
  const safePath = sanitizePath(path);
  if (!format) return `{{${safePath}}}`;
  switch (format) {
    case 'currency':
      return `{{formatCurrency ${safePath}}}`;
    case 'number':
      return `{{formatNumber ${safePath}}}`;
    case 'date':
      return `{{formatDate ${safePath}}}`;
    case 'percent':
      return `{{formatNumber ${safePath}}}%`;
  }
}

/** Si `value` es un path limpio lo devuelve como expresión Handlebars; si no, como literal entre comillas. */
function asLiteralOrExpr(value: string): string {
  if (/^[a-zA-Z_][\w.]*$/.test(value)) return value;
  return `"${value.replace(/"/g, '\\"')}"`;
}

function sanitizePath(path: string): string {
  // Permitimos letras, dígitos, punto y underscore. Cualquier otra cosa se cae
  // silenciosamente para evitar que un path malformado rompa la plantilla.
  return path.replace(/[^\w.]/g, '');
}

// ---------- escaping ----------

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}

function normalizeColumnWidths(columns: LinesTableColumn[]): LinesTableColumn[] {
  const total = columns.reduce((acc, c) => acc + c.widthPct, 0);
  if (total === 0) {
    const even = 100 / Math.max(columns.length, 1);
    return columns.map((c) => ({ ...c, widthPct: even }));
  }
  if (Math.abs(total - 100) < 0.01) return columns;
  const scale = 100 / total;
  return columns.map((c) => ({ ...c, widthPct: c.widthPct * scale }));
}
