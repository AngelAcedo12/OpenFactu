import React from 'react';

/**
 * Manifiesto oficial para un plugin de OpenFactu.
 */
export interface OpenFactuPluginManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  ui?: {
    routes?: Array<{
      path: string;
      title: string;
      type: 'table' | 'form' | 'custom' | 'dashboard';
      config: {
        endpoint?: string;
        component?: string;
        props?: any;
        columns?: any[];
      };
    }>;
    menuItems: Array<{
      label: string;
      path: string;
      icon: string;
    }>;
  };
}

/**
 * Contexto de inicialización del servidor ERP para plugins.
 */
export interface PluginServerContext {
  app: any; // Express app instance
  migration: {
    addCustomField: (field: any) => Promise<void>;
  };
}

/**
 * Definición de la función init() del plugin.
 */
export type PluginInitFunction = (context: PluginServerContext) => void | Promise<void>;

/**
 * Nota: El SDK no requiere que instales React localmente para funcionar en el ERP.
 * Sin embargo, lo usamos aquí para proveer tipos genéricos durante el desarrollo.
 */
export type OpenFactuComponent<P = {}> = React.FC<P>;

/**
 * Nombres de las tablas del ERP disponibles para extensión vía plugins.
 * Cualquier tabla listada aquí puede recibir campos custom.
 */
export type CoreTableName =
  // Documentos — cabeceras
  | 'SalesInvoice'
  | 'SalesOrder'
  | 'SalesDeliveryNote'
  | 'PurchaseInvoice'
  | 'PurchaseOrder'
  | 'PurchaseDeliveryNote'
  // Documentos — líneas
  | 'SalesInvoiceLine'
  | 'SalesOrderLine'
  | 'SalesDeliveryNoteLine'
  | 'PurchaseInvoiceLine'
  | 'PurchaseOrderLine'
  | 'PurchaseDeliveryNoteLine'
  // Maestros
  | 'BusinessPartner'
  | 'Item'
  | 'Warehouse'
  | 'WarehouseZone'
  | 'Category'
  | 'UnitOfMeasure'
  // Sistema
  | 'AccountingPeriod'
  | 'DocumentSeries';

/**
 * Tipos de datos soportados para la extensión de tablas.
 */
export type FieldType = 'TEXT' | 'INTEGER' | 'DECIMAL' | 'BOOLEAN' | 'DATE' | 'JSON';

/**
 * Definición de un campo inyectado.
 */
export interface InjectedField {
  pluginId: string;
  tableName: CoreTableName | string; // Permite tablas core o personalizadas
  fieldName: string;
  fieldType: FieldType;
  label: string;
}

/**
 * Re-exportamos los tipos de los componentes principales de la UI
 * para que el desarrollador tenga IntelliSense.
 */
export interface UIComponents {
  Button: React.FC<any>;
  Card: React.FC<any>;
  Table: React.FC<any>;
  Badge: React.FC<any>;
  Input: React.FC<any>;
  Loader: React.FC<any>;
  ToastProvider: React.FC<{ children: React.ReactNode }>;

  useToast: () => {
    success: (msg: string) => void;
    error: (msg: string) => void;
    info: (msg: string) => void;
    warning: (msg: string) => void;
  };
}
