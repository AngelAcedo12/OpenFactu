import { Express } from 'express';
import { MigrationEngine } from '../core/plugins/MigrationEngine';

export interface PluginContext {
  app: Express;
  migration: typeof MigrationEngine;
}

export type PluginInit = (context: PluginContext) => void | Promise<void>;
