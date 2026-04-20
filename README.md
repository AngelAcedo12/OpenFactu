<div align="center">

# OpenFactu

**ERP de facturación open source · Multi-tenant · Extensible con plugins · Listo para producción**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![npm](https://img.shields.io/npm/v/@openfactu/cli?label=%40openfactu%2Fcli)](https://www.npmjs.com/package/@openfactu/cli)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)](https://hub.docker.com)

[Instalación](#instalación-rápida) · [Características](#qué-incluye) · [CLI](#cli) · [Plugins](#plugins) · [Desarrollo](#desarrollo)

</div>

---

## ¿Qué es OpenFactu?

OpenFactu es un ERP de facturación completo, **gratuito y de código abierto**, diseñado para pymes y desarrolladores. Se despliega con tres comandos en cualquier sistema operativo y escala desde una sola empresa hasta instalaciones multi-tenant con esquemas de base de datos completamente aislados.

- **Sin vendor lock-in** — tus datos en tu infraestructura, bajo tu control.
- **Extensible** — amplía cualquier módulo mediante el sistema de plugins sin tocar el núcleo.
- **API-first** — REST clásico y FactuAPI transaccional para integraciones avanzadas.

---

## Instalación rápida

> **Requisitos previos:** Node.js ≥ 18 y Docker Desktop instalado y en ejecución.

```bash
# 1. Instalar el CLI
npm i -g @openfactu/cli

# 2. Descargar OpenFactu (puedes elegir la versión)
openfactu install

# 3. Desplegar
cd openfactu
openfactu deploy
```

El CLI descarga la release desde GitHub, levanta Docker Compose y configura todos los servicios automáticamente. Al finalizar verás la URL local donde acceder a la interfaz.

---

## Qué incluye

| Módulo | Descripción |
|---|---|
| 🧾 **Facturación completa** | Pedidos, albaranes, facturas de ventas y compras |
| 🏢 **Multi-empresa** | Cada empresa tiene su propio esquema de BD aislado |
| 📦 **Inventario** | Almacenes, zonas, lotes, series y stock por ubicación |
| 🤝 **Partners** | Clientes y proveedores con grupos, direcciones y listas de precios |
| 🧮 **Impuestos** | IVA configurable por grupo fiscal |
| 📄 **Plantillas PDF** | Documentos personalizables con HTML y Handlebars |
| 🔌 **Plugins** | Extensiones activables por empresa sin reiniciar el servidor |
| 🔗 **API REST** | CRUD completo para todas las entidades |
| ⚡ **FactuAPI** | API programática con transacciones atómicas e IDs pre-asignados |
| 🌙 **Dark mode** | Interfaz con soporte completo para modo oscuro |
| 📋 **Audit log** | Registro inmutable de todos los cambios |

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 19 · Tailwind CSS · Vite |
| Backend | Express · TypeScript · Drizzle ORM |
| Base de datos | PostgreSQL 15 |
| Infraestructura | Docker · Docker Compose |
| CLI | Commander.js · Inquirer |

---

## Estructura del monorepo

```
apps/
  server/          # API REST + lógica de negocio
  web/             # Frontend React
packages/
  cli/             # CLI (@openfactu/cli)
  ui/              # Componentes UI compartidos
  common/          # Hooks y utilidades React
  pdf/             # Generación de PDFs
  sdk/             # SDK para integraciones externas
  plugin-sdk/      # SDK para desarrollo de plugins
plugins/           # Plugins instalados
```

---

## CLI

```bash
npm i -g @openfactu/cli
```

### Despliegue y configuración

| Comando | Descripción |
|---|---|
| `openfactu install` | Descarga e instala (elige release de GitHub) |
| `openfactu deploy` | Configura acceso externo (LAN / internet) |
| `openfactu deploy:status` | Estado de los contenedores |
| `openfactu setup` | Configuración inicial de la base de datos |
| `openfactu update` | Actualiza a una nueva versión sin perder datos |
| `openfactu version` | Muestra las versiones del sistema |

### Migraciones

| Comando | Descripción |
|---|---|
| `openfactu migrate` | Ejecuta migraciones pendientes |
| `openfactu migrate:status` | Estado de migraciones por tenant |

### Tenants y plugins

| Comando | Descripción |
|---|---|
| `openfactu tenant list` | Lista las empresas registradas |
| `openfactu tenant create` | Crea una empresa nueva |
| `openfactu plugin list` | Lista plugins y su estado por empresa |

---

## Plugins

Los plugins se colocan en la carpeta `/plugins/` y se activan o desactivan por empresa desde la interfaz web (**Gestor de Plugins**) o mediante la API:

```
POST /api/plugins/{pluginId}/activate
POST /api/plugins/{pluginId}/deactivate
GET  /api/plugins/available
```

### Crear tu primer plugin

```typescript
// plugins/mi-plugin/index.ts
export const init = async ({ hooks, migration, factuApi }) => {
  // Añadir un campo personalizado a la BD
  await migration.addCustomField({
    pluginId: 'mi-plugin',
    tableName: 'BusinessPartner',
    fieldName: 'loyalty_points',
    type: 'INTEGER',
    label: 'Puntos de fidelidad',
  });

  // Registrar un hook antes de crear una factura
  hooks.register('salesInvoice.beforeCreate', async (ctx) => {
    // Tu lógica aquí
  });
};
```

Los plugins pueden declarar migraciones propias, registrar hooks en el ciclo de vida de los documentos, añadir campos personalizados y exponer sus propios endpoints REST, todo ello sin modificar el núcleo de OpenFactu.

---

## Desarrollo

```bash
git clone https://github.com/AngelAcedo12/OpenFactu.git
cd OpenFactu
npm install
npm run dev:all
```

Esto levanta PostgreSQL en Docker y arranca `server` + `web` en modo desarrollo con hot-reload.

### Flujo de trabajo habitual

```bash
# Crear un tenant de prueba
openfactu tenant create

# Ver el estado de las migraciones
openfactu migrate:status

# Ejecutar migraciones pendientes
openfactu migrate
```

---

## Contribuir

Las contribuciones son bienvenidas. Por favor, abre un issue antes de enviar un pull request para discutir los cambios que quieres realizar.

1. Haz fork del repositorio
2. Crea una rama: `git checkout -b feature/mi-mejora`
3. Commitea tus cambios: `git commit -m 'feat: añade mi mejora'`
4. Haz push: `git push origin feature/mi-mejora`
5. Abre un Pull Request

---

## Licencia

Distribuido bajo la licencia **MIT**. Consulta el archivo [LICENSE](LICENSE) para más información.
