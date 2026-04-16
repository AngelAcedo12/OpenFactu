export type DocType = 'SINV' | 'PINV' | 'SDN' | 'PDN' | 'SO' | 'PO';

export interface DocumentLineData {
  lineNum: number;
  itemId: string;
  itemCode: string;
  itemName: string;
  itemDescription: string | null;
  quantity: number;
  uom: string | null;
  price: number;
  taxRate: number;
  lineTotal: number;
  category: string | null;
  batches?: Array<{ batchNum: string; quantity: number }>;
  customFields?: Record<string, any>;
}

export interface TaxBreakdownEntry {
  rate: number;
  base: number;
  tax: number;
}

export interface DocumentHeaderData {
  id: string;
  docCode: string;
  date: string;
  status: string;
  statusLabel: string;
  subtotal: number;
  taxTotal: number;
  total: number;
  totalInWords: string;
  taxBreakdown: TaxBreakdownEntry[];
  billToAddress: string | null;
  shipToAddress: string | null;
  baseDocCode: string | null;
  customFields?: Record<string, any>;
}

export interface PartnerAddressObject {
  street: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string | null;
}

export interface PartnerData {
  id: string;
  name: string;
  foreignName: string | null;
  taxId: string | null;
  address: string | null;
  billingAddress: PartnerAddressObject | null;
  shippingAddress: PartnerAddressObject | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  priceListName: string | null;
}

export interface CompanyData {
  name: string;
  taxId: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logoUrl: string | null;
}

export interface DocumentPdfPayload {
  doc: DocumentHeaderData;
  partner: PartnerData;
  company: CompanyData;
  lines: DocumentLineData[];
  generatedAt: string;
}
