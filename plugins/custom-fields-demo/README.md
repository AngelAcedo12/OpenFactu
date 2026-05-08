# Demo · Campos custom

Plugin de ejemplo que muestra cómo un tercero añade campos propios al ERP.

## Qué hace

- Añade 2 campos de **cabecera** a la factura de venta: `urgency`, `deliveryNotes`.
- Añade 2 campos de **línea** a la factura de venta: `qaCheckPassed`, `batchRef`.
- Engancha el evento `salesInvoice.afterCreate` y loguea lo que llegó.

Las columnas se crean físicamente en cada tenant con prefijo `p_`.

## Cómo probarlo

1. Reinicia el server — el plugin se detecta automáticamente.
2. En la UI, `Plugins` → activar **Demo · Campos custom** para el tenant.
3. Las migraciones se aplican al activar. Comprueba:
   ```sql
   \d "<tu_schema>"."SalesInvoice";       -- aparecen p_urgency, p_deliveryNotes
   \d "<tu_schema>"."SalesInvoiceLine";   -- aparecen p_qaCheckPassed, p_batchRef
   ```
4. Crea una factura de venta:
   - En el sidebar aparece el panel **Plugin · custom-fields-demo** con los
     dos campos de cabecera.
   - La tabla de líneas gana dos columnas nuevas (`QA aprobado`, `Ref. lote externa`).
5. Guarda. En la consola del server verás:
   ```
   [custom-fields-demo] Factura creada { urgency: 'high', lines: [...] }
   ```
