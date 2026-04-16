export interface BrandingConfig {
  colorPrimary: string;
  colorAccent: string;
  logoUrl: string;
  appName: string;
  fontFamily: 'sans' | 'serif' | 'mono';
  themeMode: 'light' | 'dark';
}

export interface FormatConfig {
  locale: string;
  dateFormat: string;
  decimalPrecision: number;
  quantityPrecision: number;
}

export interface FlagsConfig {
  allowNegativeStock: boolean;
  autoConfirmBatches: boolean;
  watermarkDraft: boolean;
  confirmBeforeCancel: boolean;
  enforceWarehouseZones: boolean;
}

export const BRANDING_DEFAULTS: BrandingConfig = {
  colorPrimary: '#2563eb',
  colorAccent: '#10b981',
  logoUrl: '',
  appName: 'OpenFactu',
  fontFamily: 'sans',
  themeMode: 'light',
};

export const FORMAT_DEFAULTS: FormatConfig = {
  locale: 'es-ES',
  dateFormat: 'dd/MM/yyyy',
  decimalPrecision: 2,
  quantityPrecision: 2,
};

export const FLAGS_DEFAULTS: FlagsConfig = {
  allowNegativeStock: false,
  autoConfirmBatches: false,
  watermarkDraft: true,
  confirmBeforeCancel: true,
  enforceWarehouseZones: false,
};

export type ConfigSectionName = 'branding' | 'format' | 'flags';
