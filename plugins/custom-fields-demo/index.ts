import { PluginContext } from '../../apps/server/src/plugins/types';

/**
 * Plugin de ejemplo.
 *
 * - Añade campos personalizados a la CABECERA de la factura de venta
 *   (`urgency`, `deliveryNotes`).
 * - Añade campos personalizados a cada LÍNEA de la factura
 *   (`qaCheckPassed`, `batchRef`).
 * - Registra un hook `salesInvoice.afterCreate` que logea los valores
 *   custom recibidos.
 *
 * Los campos se materializan como columnas físicas con prefijo `p_` en
 * el schema del tenant. El frontend los pinta automáticamente en el
 * `PluginFieldsPanel` (cabecera) y — con el builder de columnas extendido
 * — también como columnas de la tabla de líneas.
 */
export const init = async ({ migration, hooks }: PluginContext) => {
  const pluginId = 'custom-fields-demo';

  // --- Campos de cabecera ------------------------------------------------
  await migration.addCustomField({
    pluginId,
    tableName: 'SalesInvoice',
    fieldName: 'urgency',
    type: 'ENUM',
    label: 'Urgencia',
    options: [
      { value: 'low', label: 'Baja' },
      { value: 'normal', label: 'Normal' },
      { value: 'high', label: 'Alta' },
    ],
    required: true,
  });
  await migration.addCustomField({
    pluginId,
    tableName: 'SalesInvoice',
    fieldName: 'deliveryNotes',
    type: 'TEXT',
    label: 'Notas de entrega',
  });

  // --- Campos de línea ---------------------------------------------------
  await migration.addCustomField({
    pluginId,
    tableName: 'SalesInvoiceLine',
    fieldName: 'qaCheckPassed',
    type: 'BOOLEAN',
    label: 'QA aprobado',
  });
  await migration.addCustomField({
    pluginId,
    tableName: 'SalesInvoiceLine',
    fieldName: 'batchRef',
    type: 'TEXT',
    label: 'Ref. lote externa',
  });

  // --- Hook de ejemplo ---------------------------------------------------
  hooks.register(
    'salesInvoice.afterCreate',
    async (ctx: any) => {
      const { data } = ctx || {};
      // eslint-disable-next-line no-console
      console.log('[custom-fields-demo] Factura creada', {
        id: data?.id,
        urgency: data?.pluginData?.urgency,
        deliveryNotes: data?.pluginData?.deliveryNotes,
        lines: (data?.lines || []).map((l: any) => ({
          itemId: l.itemId,
          qa: l?.pluginData?.qaCheckPassed,
          batchRef: l?.pluginData?.batchRef,
        })),
      });
    },
    pluginId,
  );
};
