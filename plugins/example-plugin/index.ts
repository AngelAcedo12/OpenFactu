import { PluginContext } from '../../apps/server/src/plugins/types';

/**
 * Ejemplo de un plugin real que extiende tanto el API como el Esquema.
 */
export const init = async ({ app, migration }: PluginContext) => {
  console.log('[Example Plugin] Inicializando módulo de ejemplo...');

  // 1. Inyectar campo personalizado en la Base de Datos
  // Esto creará la columna "internal_notes" en todos los tenants
  try {
    await migration.addCustomField({
      pluginId: 'example-plugin',
      tableName: 'BusinessPartner',
      fieldName: 'internal_notes',
      type: 'TEXT',
      label: 'Notas Internas (Plugin)'
    });
  } catch (err) {
    console.error('[Example Plugin] Error al inyectar campo:', err);
  }

  // 2. Inyectar una nueva ruta al APIREST
  app.get('/api/plugins/example', (req, res) => {
    res.json({
      plugin: 'example-plugin',
      message: 'Esta ruta fue inyectada desde el plugin!',
      injectedField: 'internal_notes',
      status: 'active'
    });
  });
};
