import type { DocType } from './types';
import { DEFAULT_VISUAL_OPTIONS } from './visualOptionsSchema';
import { buildVisualTemplate } from './visualTemplateBuilder';

export type { DocType };

/**
 * Genera la plantilla HTML por defecto para un tipo de documento.
 * Delega en `buildVisualTemplate` con las opciones default — de esta forma,
 * la plantilla default y las plantillas editadas desde el editor visual comparten
 * el mismo generador y tienen la misma estructura.
 */
export function getDefaultTemplate(docType: DocType): string {
  return buildVisualTemplate(docType, DEFAULT_VISUAL_OPTIONS);
}

export const DEFAULT_TEMPLATE_NAMES: Record<DocType, string> = {
  SINV: 'Factura de Venta - Estándar',
  PINV: 'Factura de Compra - Estándar',
  SDN: 'Albarán de Venta - Estándar',
  PDN: 'Albarán de Compra - Estándar',
  SO: 'Pedido de Venta - Estándar',
  PO: 'Pedido de Compra - Estándar',
};

export const ALL_DOC_TYPES: DocType[] = ['SINV', 'PINV', 'SDN', 'PDN', 'SO', 'PO'];
