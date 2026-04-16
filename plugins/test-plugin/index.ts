import { PluginContext } from '../../apps/server/src/plugins/types';

export const init = async (context: PluginContext) => {
  console.log('[Test Plugin] Inicializando...');

  // 1. Registrar campo personalizado
  await context.migration.addCustomField({
    pluginId: 'test-plugin',
    tableName: 'SalesInvoice',
    fieldName: 'p_shipping_notes',
    type: 'TEXT',
    label: 'Notas de Envío (Logística)',
  });

  // 2. NUEVO: Crear tabla personalizada
  await context.migration.createTable({
    pluginId: 'test-plugin',
    tableName: 'tracking_logs',
    columns: [
      { name: 'id', type: 'UUID', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'invoice_id', type: 'TEXT', nullable: false },
      { name: 'status', type: 'TEXT', nullable: false },
      { name: 'notes', type: 'TEXT', nullable: true },
      { name: 'created_at', type: 'TIMESTAMP', default: 'now()' },
    ],
  });

  // 3. Registrar hook de validación (Sintaxis Mejorada)
  context.documents.onBeforeCreate('SalesInvoice', async (ctx) => {
    const { data } = ctx;
    console.log('[Test Plugin] Hook beforeCreate disparado para factura:', data.docNum);

    // Ejemplo de validación de negocio
    const total = Number(data.total || 0);
    if (total > 1000 && !data.p_shipping_notes) {
      throw new Error(
        'Las facturas superiores a 1000€ requieren notas de envío obligatorias (Regla de Negocio Plugin)',
      );
    }
  });

  // 4. NUEVO: Registrar hook para GUARDAR LOGS en la tabla personalizada
  context.documents.onAfterCreate('SalesInvoice', async (ctx) => {
    const { data, db } = ctx;
    const { sql } = await import('drizzle-orm');

    console.log('[Test Plugin] Factura creada, guardando log en pt_tracking_logs...');

    try {
      await db.execute(sql`
                INSERT INTO "pt_tracking_logs" ("id", "invoice_id", "status", "notes")
                VALUES (gen_random_uuid(), ${data.id}, 'CREATED', 'Log automático desde plugin')
            `);
      console.log('[Test Plugin] Log guardado con éxito.');
    } catch (err) {
      console.error('[Test Plugin] Error al guardar log:', err);
    }
  });

  console.log('[Test Plugin] Configuración completada.');
};
