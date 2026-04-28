import { HookManager } from '../core/plugins/HookManager';
import { Express } from 'express';
import { MigrationEngine } from '../core/plugins/MigrationEngine';
import { FactuApi, FactuApiTransaction } from '../core/plugins/FactuApi';
import type { ICarrierAdapter } from '../core/carriers/ICarrierAdapter';

export type HookHandler = (context: any) => Promise<void> | void;

export interface PluginContext {
  app: Express;
  migration: {
    addCustomField: typeof MigrationEngine.addCustomField;
    createTable: typeof MigrationEngine.createPluginTable;
  };
  hooks: {
    register: typeof HookManager.register;
  };
  documents: {
    onBeforeCreate: (tableName: string, handler: HookHandler) => void;
    onAfterCreate: (tableName: string, handler: HookHandler) => void;
  };
  /** FactuAPI — crea documentos programáticamente con toda la lógica de negocio. */
  factuApi: typeof FactuApi;
  /**
   * Registrar adapters de transportista desde un plugin. El `id` del
   * adapter es la clave única que aparecerá en el desplegable de
   * "Ajustes → Transportistas → Integración".
   */
  carriers: {
    register: (adapter: ICarrierAdapter) => void;
  };
}

export type PluginInit = (context: PluginContext) => void | Promise<void>;
