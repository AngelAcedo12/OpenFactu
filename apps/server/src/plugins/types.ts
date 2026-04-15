import { HookManager } from '../core/plugins/HookManager';
import { Express } from 'express';
import { MigrationEngine } from '../core/plugins/MigrationEngine';

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
}

export type PluginInit = (context: PluginContext) => void | Promise<void>;
