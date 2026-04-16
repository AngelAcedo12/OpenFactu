import React from 'react';

// ── Hook Context (lo que recibe un hook al ejecutarse) ──

export interface HookContext {
  tenantId: string;
  db: any;
  data: any;
  user?: any;
  [key: string]: any;
}

export type HookHandler = (ctx: HookContext) => Promise<void> | void;

// ── Plugin Context (lo que recibe init()) ──

export interface PluginContext {
  app: any;
  migration: {
    addCustomField: (opts: {
      pluginId: string;
      tableName: CoreTableName | string;
      fieldName: string;
      type: 'TEXT' | 'INTEGER' | 'DECIMAL' | 'BOOLEAN' | 'JSONB';
      label: string;
    }) => Promise<void>;
    createTable: (opts: {
      pluginId: string;
      tableName: string;
      columns: Array<{
        name: string;
        type: 'TEXT' | 'INTEGER' | 'DECIMAL' | 'BOOLEAN' | 'JSONB' | 'UUID' | 'TIMESTAMP';
        primaryKey?: boolean;
        nullable?: boolean;
        default?: string;
      }>;
    }) => Promise<void>;
  };
  hooks: {
    register: (event: string, handler: HookHandler) => void;
  };
  documents: {
    onBeforeCreate: (tableName: string, handler: HookHandler) => void;
    onAfterCreate: (tableName: string, handler: HookHandler) => void;
  };
  factuApi: any;
}

export type PluginInit = (context: PluginContext) => void | Promise<void>;

// ── Manifest ──

export interface PluginManifest {
  name: string;
  version: string;
  description?: string;
  author?: string;
  logo?: string;
  ui?: {
    routes?: Array<{
      path: string;
      title: string;
      type: 'table' | 'form' | 'custom' | 'dashboard';
      icon?: string;
      config?: any;
    }>;
    menuItems?: Array<{
      label: string;
      path: string;
      icon: string;
    }>;
  };
}

// ── Tablas del ERP ──

export type CoreTableName =
  | 'SalesInvoice' | 'SalesOrder' | 'SalesDeliveryNote'
  | 'PurchaseInvoice' | 'PurchaseOrder' | 'PurchaseDeliveryNote'
  | 'SalesInvoiceLine' | 'SalesOrderLine' | 'SalesDeliveryNoteLine'
  | 'PurchaseInvoiceLine' | 'PurchaseOrderLine' | 'PurchaseDeliveryNoteLine'
  | 'BusinessPartner' | 'Item' | 'Warehouse' | 'WarehouseZone'
  | 'Category' | 'UnitOfMeasure' | 'AccountingPeriod' | 'DocumentSeries';

// ── Hooks disponibles ──

export type DocumentType =
  | 'salesInvoice' | 'purchaseInvoice'
  | 'salesOrder' | 'purchaseOrder'
  | 'salesDeliveryNote' | 'purchaseDeliveryNote';

export type HookEvent = `${DocumentType}.${'beforeCreate' | 'afterCreate'}`;

// ── UI Components (tipos para IntelliSense) ──

export type OpenFactuComponent<P = {}> = React.FC<P>;

export interface UIComponents {
  Button: React.FC<any>;
  Card: React.FC<any>;
  Table: React.FC<any>;
  Badge: React.FC<any>;
  Input: React.FC<any>;
  Loader: React.FC<any>;
  Modal: React.FC<any>;
  useToast: () => {
    success: (msg: string) => void;
    error: (msg: string) => void;
    info: (msg: string) => void;
    warning: (msg: string) => void;
  };
}

// ── Re-exports para compatibilidad ──

/** @deprecated Usa PluginContext */
export type PluginServerContext = PluginContext;
/** @deprecated Usa PluginInit */
export type PluginInitFunction = PluginInit;
/** @deprecated Usa PluginManifest */
export type OpenFactuPluginManifest = PluginManifest;
export type FieldType = 'TEXT' | 'INTEGER' | 'DECIMAL' | 'BOOLEAN' | 'JSONB';
export interface InjectedField {
  pluginId: string;
  tableName: CoreTableName | string;
  fieldName: string;
  fieldType: FieldType;
  label: string;
}
