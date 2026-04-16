import { Express } from 'express';
import fs from 'fs';
import path from 'path';
import { MigrationEngine } from '../core/plugins/MigrationEngine';
import { PluginContext } from './types';
import { HookManager } from '../core/plugins/HookManager';
import { FactuApi } from '../core/plugins/FactuApi';
import { TenantPluginCache } from '../core/plugins/TenantPluginCache';

// Almacén en memoria de plugins cargados (instalados globalmente)
export const activePlugins: string[] = [];
export const activePluginManifests: any[] = [];

export const loadPlugins = async (app: Express) => {
  console.log('[Plugins] Inicializando motor de plugins...');
  const pluginsDir = path.join(__dirname, '../../../../plugins');

  if (!fs.existsSync(pluginsDir)) {
    console.log('[Plugins] No se encontró la ruta global de plugins:', pluginsDir);
    return;
  }

  const pluginFolders = fs.readdirSync(pluginsDir);

  for (const folder of pluginFolders) {
    const pluginPath = path.join(pluginsDir, folder);

    // Solo procesar si es un directorio
    if (fs.statSync(pluginPath).isDirectory()) {
      try {
        const pluginModulePath = path.resolve(pluginPath, 'index.ts');
        const jsPluginModulePath = path.resolve(pluginPath, 'index.js');
        const manifestPath = path.resolve(pluginPath, 'manifest.json');

        // 1. Cargar Manifiesto de UI si existe
        if (fs.existsSync(manifestPath)) {
          try {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            activePluginManifests.push({ ...manifest, id: folder });
            console.log(`[Plugins] Manifiesto de UI cargado para: ${folder}`);
          } catch (e) {
            console.error(`[Plugins] Error al leer manifest.json de ${folder}`);
          }
        }

        // 2. Cargar Módulo de Servidor
        let pluginModule: any = null;

        if (fs.existsSync(pluginModulePath)) {
          console.log(`[Plugins] Intentando cargar archivo TS: ${pluginModulePath}`);
          pluginModule = require(pluginModulePath);
        } else if (fs.existsSync(jsPluginModulePath)) {
          console.log(`[Plugins] Intentando cargar archivo JS: ${jsPluginModulePath}`);
          pluginModule = require(jsPluginModulePath);
        }

        // Importante: Handle named export 'init'
        const initFn = pluginModule?.init || pluginModule?.default?.init;

        if (typeof initFn === 'function') {
          const context: PluginContext = {
            app,
            migration: {
              addCustomField: MigrationEngine.addCustomField.bind(MigrationEngine),
              createTable: MigrationEngine.createPluginTable.bind(MigrationEngine),
            },
            hooks: {
              register: (event: string, handler: any) => {
                HookManager.register(event, handler, folder);
              },
            },
            documents: {
              onBeforeCreate: (tableName: string, handler: any) => {
                const event = `${tableName.charAt(0).toLowerCase() + tableName.slice(1)}.beforeCreate`;
                HookManager.register(event, handler, folder);
              },
              onAfterCreate: (tableName: string, handler: any) => {
                const event = `${tableName.charAt(0).toLowerCase() + tableName.slice(1)}.afterCreate`;
                HookManager.register(event, handler, folder);
              },
            },
            factuApi: FactuApi,
          };

          await initFn(context);
          activePlugins.push(folder);
          console.log(`[Plugins] Plugin cargado y activado exitosamente: ${folder}`);
        } else {
          console.warn(`[Plugins] El plugin ${folder} no exporta una función 'init'.`);
        }
      } catch (err: any) {
        console.error(`[Plugins] Error al cargar el plugin ${folder}:`, err);
      }
    }
  }

  // Cargar caché de activación por tenant
  try {
    await TenantPluginCache.loadAll();
  } catch (err) {
    console.warn('[Plugins] No se pudo cargar la caché de TenantPlugin (tabla aún no existe?):', err);
  }
};
