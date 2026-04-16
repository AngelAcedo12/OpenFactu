# @openfactu/plugin-sdk

SDK oficial para desarrollar plugins de [OpenFactu](https://github.com/AngelAcedo12/OpenFactu).

## Instalacion

```bash
npm install @openfactu/plugin-sdk
```

## Inicio rapido

```typescript
import type { PluginContext, HookContext } from '@openfactu/plugin-sdk';

const PLUGIN_ID = 'mi-plugin';

export const init = async ({ hooks, migration, documents, app }: PluginContext) => {
  // Añadir campo a una tabla
  await migration.addCustomField({
    pluginId: PLUGIN_ID,
    tableName: 'BusinessPartner',
    fieldName: 'loyalty_points',
    type: 'INTEGER',
    label: 'Puntos de fidelidad',
  });

  // Hook antes de crear factura
  documents.onBeforeCreate('SalesInvoice', async (ctx: HookContext) => {
    if (ctx.data.total > 10000) {
      throw new Error('Limite excedido');
    }
  });

  // Ruta API personalizada
  app.get(`/api/plugins/${PLUGIN_ID}/status`, (req, res) => {
    res.json({ status: 'active' });
  });
};
```

## Tipos disponibles

| Tipo | Descripcion |
|------|-------------|
| `PluginContext` | Lo que recibe `init()`: app, migration, hooks, documents, factuApi |
| `HookContext` | Lo que recibe un hook: tenantId, db, data, user |
| `PluginInit` | Tipo de la funcion init |
| `PluginManifest` | Estructura del manifest.json |
| `CoreTableName` | Tablas del ERP que se pueden extender |
| `DocumentType` | Tipos de documento (salesInvoice, purchaseInvoice, etc.) |
| `HookEvent` | Eventos de hooks (salesInvoice.beforeCreate, etc.) |
| `HookHandler` | Tipo del handler de un hook |

## Componentes UI

Los plugins pueden tener componentes React que se cargan en el ERP. Usa `@openfactu/ui` para los componentes:

```tsx
import React, { useState } from 'react';
import { Card, Button, Table } from '@openfactu/ui';

const Page = () => {
  return (
    <Card>
      <h2>Mi Plugin</h2>
      <Button onClick={() => alert('hola')}>Click</Button>
    </Card>
  );
};

export default Page;
```

## Manifest

```json
{
  "name": "Mi Plugin",
  "version": "1.0.0",
  "description": "Descripcion",
  "logo": "Puzzle",
  "ui": {
    "routes": [
      {
        "path": "/plugin/mi-plugin",
        "title": "Mi Plugin",
        "type": "custom",
        "config": { "component": "ui/Page.tsx" }
      }
    ],
    "menuItems": [
      { "label": "Mi Plugin", "path": "/plugin/mi-plugin", "icon": "Puzzle" }
    ]
  }
}
```

## Desarrollo remoto

Sube tu plugin a un servidor OpenFactu sin necesidad de acceso SSH:

```bash
# Subir una vez
openfactu plugin push --server http://mi-servidor:3000 --client-id ofk_... --client-secret ofs_...

# Auto-sync al guardar
openfactu plugin watch --server http://mi-servidor:3000 --client-id ofk_... --client-secret ofs_...
```

Las dev keys se generan desde la UI del ERP: Plugins > Desarrollo > Generar API Key.

## Links

- [Documentacion](https://openfactuerp.org/plugins/crear-plugin/)
- [Template](https://github.com/AngelAcedo12/openfactu-plugin-template)
- [Marketplace](https://openfactuerp.org/marketplace/)
- [GitHub](https://github.com/AngelAcedo12/OpenFactu)

## Licencia

MIT
