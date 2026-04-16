# OpenFactu

ERP de facturacion open source. Multi-tenant, extensible con plugins, desplegable con Docker en Windows, Mac y Linux.

## Instalacion rapida

```bash
# 1. Instalar el CLI
npm i -g @openfactu/cli

# 2. Descargar OpenFactu (te deja elegir la version)
openfactu install

# 3. Desplegar
cd openfactu
openfactu deploy
```

Eso es todo. El CLI descarga la release, levanta Docker y configura todo.

## Que incluye

- **Facturacion completa** -- Pedidos, albaranes, facturas (ventas y compras)
- **Multi-empresa** -- Cada empresa tiene su esquema de BD aislado
- **Inventario** -- Almacenes, zonas, lotes, series, stock por ubicacion
- **Partners** -- Clientes y proveedores con grupos, direcciones, listas de precios
- **Impuestos** -- IVA configurable por grupo fiscal
- **Plantillas PDF** -- Documentos personalizables con HTML/Handlebars
- **Plugins** -- Sistema de extensiones activables por empresa
- **API REST** -- CRUD completo para todas las entidades
- **FactuAPI** -- API programatica con transacciones atomicas e IDs pre-asignados
- **Dark mode** -- Interfaz con soporte completo para modo oscuro
- **Audit log** -- Registro de todos los cambios

## Stack

| Capa | Tecnologia |
|------|------------|
| Frontend | React 19, Tailwind CSS, Vite |
| Backend | Express, TypeScript, Drizzle ORM |
| Base de datos | PostgreSQL 15 |
| Infra | Docker, Docker Compose |
| CLI | Commander.js, Inquirer |

## Estructura del monorepo

```
apps/
  server/          API REST + logica de negocio
  web/             Frontend React

packages/
  cli/             CLI (@openfactu/cli)
  ui/              Componentes UI compartidos
  common/          Hooks y utilidades React
  pdf/             Generacion de PDFs
  sdk/             SDK para integraciones externas
  plugin-sdk/      SDK para desarrollo de plugins

plugins/           Plugins instalados
```

## CLI

```bash
npm i -g @openfactu/cli
```

| Comando | Descripcion |
|---------|-------------|
| `openfactu install` | Descarga e instala (elige release de GitHub) |
| `openfactu deploy` | Configura acceso externo (LAN / internet) |
| `openfactu deploy:status` | Estado de los contenedores |
| `openfactu setup` | Configuracion inicial de BD |
| `openfactu migrate` | Ejecuta migraciones pendientes |
| `openfactu migrate:status` | Estado de migraciones por tenant |
| `openfactu tenant list` | Lista empresas |
| `openfactu tenant create` | Crea una empresa nueva |
| `openfactu plugin list` | Lista plugins y estado por empresa |
| `openfactu update` | Actualiza sin perder datos |
| `openfactu version` | Versiones del sistema |

## Desarrollo

```bash
git clone https://github.com/AngelAcedo12/OpenFactu.git
cd OpenFactu
npm install
npm run dev:all
```

Esto levanta PostgreSQL en Docker y arranca server + web en modo desarrollo.

## Plugins

Los plugins se instalan en la carpeta `/plugins/` y se activan/desactivan por empresa desde la interfaz web (Gestor de Plugins) o via API:

```
POST /api/plugins/{pluginId}/activate
POST /api/plugins/{pluginId}/deactivate
GET  /api/plugins/available
```

Crear un plugin:

```typescript
// plugins/mi-plugin/index.ts
export const init = async ({ hooks, migration, factuApi }) => {
  // Añadir campo a la BD
  await migration.addCustomField({
    pluginId: 'mi-plugin',
    tableName: 'BusinessPartner',
    fieldName: 'loyalty_points',
    type: 'INTEGER',
    label: 'Puntos de fidelidad',
  });

  // Hook antes de crear factura
  hooks.register('salesInvoice.beforeCreate', async (ctx) => {
    // tu logica
  });
};
```

## Licencia

MIT
