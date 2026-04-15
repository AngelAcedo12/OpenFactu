// Exportaciones base para OpenFactu

export interface Empresa {
  id: string;
  nombre: string;
  nif: string;
}

export interface Cliente {
  id: string;
  nombre: string;
  email: string;
  nif?: string;
}

export interface Producto {
  id: string;
  nombre: string;
  precio: number;
}

export interface Factura {
  id: string;
  clienteId: string;
  empresaId: string;
  fecha: Date;
  total: number;
  pluginData?: Record<string, any>;
}

export interface PluginConfig {
  id: string;
  name: string;
  version: string;
  description: string;
}

export * from './hooks/useDocument';
export * from './hooks/useDataTable';
export * from './format';
export * from './geoValidation';
