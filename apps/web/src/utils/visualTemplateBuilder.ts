/**
 * Shim de retrocompatibilidad. El generador canónico vive en `@openfactu/pdf/browser`.
 * Este archivo se mantiene para no romper imports existentes mientras se migran.
 */
export {
  buildVisualTemplate,
  DEFAULT_VISUAL_OPTIONS,
  serializeMeta,
  parseMeta,
} from '@openfactu/pdf/browser';

export type { DocType, VisualOptions } from '@openfactu/pdf/browser';
