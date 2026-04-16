// Server entrypoint — incluye puppeteer.
// Para código browser (sin puppeteer) usar `@openfactu/pdf/browser`.

export { PdfRenderer } from './PdfRenderer';
export type { RenderOptions } from './PdfRenderer';

// Re-exports del browser para que el server pueda seguir usando "@openfactu/pdf" sin split
export {
  buildVisualTemplate,
  DEFAULT_VISUAL_OPTIONS,
  serializeMeta,
  parseMeta,
  extractMetaFromHtml,
  FIELD_SCHEMA,
  HELPERS,
  DOC_TYPE_DEFAULT_TITLES,
  DOC_TYPE_PARTNER_LABELS,
  getDefaultTemplate,
  DEFAULT_TEMPLATE_NAMES,
  ALL_DOC_TYPES,
} from './browser';

export type {
  DocType,
  DocumentPdfPayload,
  DocumentHeaderData,
  DocumentLineData,
  PartnerData,
  PartnerAddressObject,
  CompanyData,
  TaxBreakdownEntry,
  VisualOptions,
  WatermarkOptions,
  FooterOptions,
  ColumnVisibility,
  FontFamily,
  PageSize,
  PageOrientation,
  MarginPreset,
  LogoPosition,
  TextAlignment,
  FieldType,
  FieldDef,
  FieldGroup,
  HelperDef,
} from './browser';
