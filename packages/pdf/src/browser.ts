/**
 * Entrypoint browser-safe del paquete @openfactu/pdf.
 * NO importa puppeteer ni nada de Node.
 * Uso: `import { buildVisualTemplate, FIELD_SCHEMA, ... } from '@openfactu/pdf/browser'`
 */

export {
  buildVisualTemplate,
  DEFAULT_VISUAL_OPTIONS
} from './visualTemplateBuilder';

export {
  serializeMeta,
  parseMeta,
  extractMetaFromHtml
} from './metaParser';

export {
  FIELD_SCHEMA,
  HELPERS,
  DOC_TYPE_DEFAULT_TITLES,
  DOC_TYPE_PARTNER_LABELS
} from './visualOptionsSchema';

export type {
  DocType,
  DocumentPdfPayload,
  DocumentHeaderData,
  DocumentLineData,
  PartnerData,
  PartnerAddressObject,
  CompanyData,
  TaxBreakdownEntry
} from './types';

export type {
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
  HelperDef
} from './visualOptionsSchema';

export {
  getDefaultTemplate,
  DEFAULT_TEMPLATE_NAMES,
  ALL_DOC_TYPES
} from './defaultTemplates';
