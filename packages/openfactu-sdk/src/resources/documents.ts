import { HttpClient } from '../http';
import type { DocType, DocumentCreateParams, DocumentResponse } from '../types';

/**
 * Resource para crear, asentar y cancelar documentos vía la DI API.
 *
 * Uso:
 *   const client = new OpenFactuClient({ ... });
 *   const result = await client.documents.create('SINV', {
 *     partnerId: '...',
 *     seriesId: '...',
 *     periodId: '...',
 *     lines: [{ itemId: '...', quantity: 5, price: 100, taxGroupId: '...' }],
 *   });
 */
export class Documents {
  constructor(private http: HttpClient) {}

  /**
   * Crea un documento del tipo especificado.
   */
  async create(docType: DocType, params: DocumentCreateParams): Promise<DocumentResponse> {
    return this.http.post<DocumentResponse>(`/api/factuapi/documents/${docType}`, params);
  }

  /**
   * Asienta un borrador (D → O). Sólo para facturas (SINV, PINV).
   */
  async post(docType: DocType, id: string): Promise<{ success: boolean; id: string; status: string }> {
    return this.http.post(`/api/factuapi/documents/${docType}/${id}/post`);
  }

  /**
   * Cancela un documento.
   */
  async cancel(docType: DocType, id: string): Promise<{ success: boolean }> {
    return this.http.post(`/api/factuapi/documents/${docType}/${id}/cancel`);
  }

  /**
   * Lee un documento por ID (usa el endpoint nativo, no el DI).
   */
  async get(docType: DocType, id: string): Promise<any> {
    const endpoints: Record<DocType, string> = {
      SINV: `/api/sales/invoices/${id}`,
      PINV: `/api/purchases/invoices/${id}`,
      SDN: `/api/sales/delivery-notes/${id}`,
      PDN: `/api/purchases/delivery-notes/${id}`,
      SO: `/api/sales/${id}`,
      PO: `/api/purchases/orders/${id}`,
    };
    return this.http.get(endpoints[docType]);
  }

  /**
   * Lista documentos del tipo especificado.
   */
  async list(docType: DocType): Promise<any[]> {
    const endpoints: Record<DocType, string> = {
      SINV: '/api/sales/invoices',
      PINV: '/api/purchases/invoices',
      SDN: '/api/sales/delivery-notes',
      PDN: '/api/purchases/delivery-notes',
      SO: '/api/sales',
      PO: '/api/purchases/orders',
    };
    return this.http.get<any[]>(endpoints[docType]);
  }
}
