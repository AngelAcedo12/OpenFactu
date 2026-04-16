import { HttpClient } from './http';
import { Documents } from './resources/documents';
import type { ConnectionConfig } from './types';

/**
 * Cliente principal del SDK de OpenFactu.
 *
 * Ejemplo:
 * ```ts
 * import { OpenFactuClient } from '@openfactu/sdk';
 *
 * const client = new OpenFactuClient({
 *   baseUrl: 'http://localhost:3000',
 *   token: 'eyJhbGci...',
 *   tenantId: 'abc-123',
 * });
 *
 * // Crear una factura de venta
 * const invoice = await client.documents.create('SINV', {
 *   partnerId: '...',
 *   seriesId: '...',
 *   periodId: '...',
 *   lines: [{ itemId: '...', quantity: 2, price: 50, taxGroupId: '...' }],
 *   customFields: { p_shipping_notes: 'Frágil' },
 * });
 *
 * // Asentar el borrador
 * await client.documents.post('SINV', invoice.id);
 *
 * // Cancelar
 * await client.documents.cancel('SINV', invoice.id);
 * ```
 */
export class OpenFactuClient {
  private http: HttpClient;

  /** Gestión de documentos (facturas, pedidos, albaranes) */
  public readonly documents: Documents;

  constructor(config: ConnectionConfig) {
    this.http = new HttpClient(config);
    this.documents = new Documents(this.http);
  }

  /**
   * Crea una nueva instancia con un token distinto (útil para cambiar de usuario).
   */
  withToken(token: string): OpenFactuClient {
    return new OpenFactuClient({
      baseUrl: (this.http as any).baseUrl,
      token,
      tenantId: (this.http as any).tenantId,
      timeout: (this.http as any).timeout,
    });
  }

  /**
   * Crea una nueva instancia para otro tenant (empresa).
   */
  withTenant(tenantId: string): OpenFactuClient {
    return new OpenFactuClient({
      baseUrl: (this.http as any).baseUrl,
      token: (this.http as any).token,
      tenantId,
      timeout: (this.http as any).timeout,
    });
  }
}
