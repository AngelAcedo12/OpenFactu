import { DEFAULT_VISUAL_OPTIONS, type VisualOptions } from './visualOptionsSchema';

const META_TAG = 'OPENFACTU-META';
const META_REGEX = new RegExp(`<!--${META_TAG}:(.*?)-->`);

/**
 * Serializa opciones visuales como comentario HTML al inicio del template.
 * Browser y server comparten esta función.
 */
export function serializeMeta(opts: VisualOptions): string {
  return `<!--${META_TAG}:${JSON.stringify(opts)}-->`;
}

/**
 * Parsea el comentario meta del HTML. Devuelve null si no hay meta.
 * Hace merge con DEFAULT_VISUAL_OPTIONS para retrocompatibilidad con plantillas
 * guardadas antes de añadir campos nuevos (deep-merge para objetos anidados).
 */
export function parseMeta(html: string): VisualOptions | null {
  const match = html.match(META_REGEX);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]);
    return mergeWithDefaults(parsed);
  } catch {
    return null;
  }
}

/**
 * Alias con semántica de "extraer" usado desde el server (renderer).
 */
export function extractMetaFromHtml(html: string): VisualOptions | null {
  return parseMeta(html);
}

function mergeWithDefaults(partial: Partial<VisualOptions>): VisualOptions {
  return {
    ...DEFAULT_VISUAL_OPTIONS,
    ...partial,
    columns: { ...DEFAULT_VISUAL_OPTIONS.columns, ...(partial.columns || {}) },
    watermark: { ...DEFAULT_VISUAL_OPTIONS.watermark, ...(partial.watermark || {}) },
    footer: { ...DEFAULT_VISUAL_OPTIONS.footer, ...(partial.footer || {}) }
  };
}
