export type DocType = 'SINV' | 'PINV' | 'SO' | 'PO' | 'SDN' | 'PDN';

export interface ConnectionConfig {
  /** URL base del servidor OpenFactu (ej. 'http://localhost:3000') */
  baseUrl: string;
  /** Token JWT de autenticación */
  token: string;
  /** ID del tenant (empresa) */
  tenantId: string;
  /** Timeout en ms para las peticiones (default: 30000) */
  timeout?: number;
}

export interface DocumentLine {
  itemId: string;
  quantity: number;
  price: number;
  taxGroupId?: string;
  warehouseId?: string;
  zoneId?: string;
  uomId?: string;
  uomFactor?: number;
  batchDetails?: Array<{
    batchNum: string;
    quantity: number;
    expiryDate?: string;
    zoneId?: string;
  }>;
  pluginData?: Record<string, any>;
}

export interface DocumentCreateParams {
  partnerId: string;
  seriesId: string;
  periodId: string;
  date?: string | Date;
  warehouseId?: string;
  billToAddress?: string;
  shipToAddress?: string;
  deliveryDate?: string | Date;
  orderId?: string;
  lines: DocumentLine[];
  customFields?: Record<string, any>;
}

export interface DocumentResponse {
  success: boolean;
  id: string;
  docNum: number;
  docType: DocType;
  label: string;
}

export interface ApiError {
  error: string;
}
