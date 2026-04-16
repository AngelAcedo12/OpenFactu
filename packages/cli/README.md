# @openfactu/cli

CLI oficial para instalar, gestionar y desplegar [OpenFactu](https://github.com/AngelAcedo12/OpenFactu) — ERP de facturacion open source.

## Instalacion

```bash
npm i -g @openfactu/cli
```

## Inicio rapido

```bash
openfactu install        # Descarga e instala OpenFactu
openfactu deploy         # Configura acceso externo
openfactu setup          # Configuracion inicial de BD
```

## Comandos

### Instalacion y actualizacion

| Comando | Descripcion |
|---------|-------------|
| `openfactu install [dir]` | Descarga desde releases de GitHub con Docker |
| `openfactu update` | Actualiza sin perder datos |
| `openfactu update:check` | Comprueba si hay versiones nuevas |

### Despliegue

| Comando | Descripcion |
|---------|-------------|
| `openfactu deploy` | Wizard para configurar acceso externo (LAN/internet) |
| `openfactu deploy:status` | Estado de los contenedores Docker |
| `openfactu rebuild` | Reconstruye y reinicia contenedores |
| `openfactu logs` | Muestra logs de los servicios |
| `openfactu stop` | Para todos los servicios |
| `openfactu restart` | Reinicia sin rebuild |

### Base de datos

| Comando | Descripcion |
|---------|-------------|
| `openfactu setup` | Configuracion inicial: BD, admin, primer tenant |
| `openfactu migrate` | Ejecuta migraciones pendientes |
| `openfactu migrate:status` | Estado de migraciones por tenant |

### Tenants (empresas)

| Comando | Descripcion |
|---------|-------------|
| `openfactu tenant list` | Lista empresas |
| `openfactu tenant create` | Crea una empresa nueva |
| `openfactu tenant sync` | Sincroniza migraciones |

### Plugins

| Comando | Descripcion |
|---------|-------------|
| `openfactu plugin list` | Lista plugins instalados con estado por tenant |
| `openfactu plugin search` | Busca en el marketplace (interactivo) |
| `openfactu plugin install <nombre>` | Descarga e instala del marketplace |
| `openfactu plugin update [nombre]` | Actualiza uno o todos |
| `openfactu plugin remove <nombre>` | Elimina un plugin |
| `openfactu plugin link [dir]` | Enlaza un plugin externo (symlink) |
| `openfactu plugin unlink <nombre>` | Quita el enlace |
| `openfactu plugin push [dir]` | Sube un plugin a un servidor remoto |
| `openfactu plugin watch [dir]` | Auto-sync al guardar (desarrollo remoto) |
| `openfactu plugin dev [nombre]` | Servidor en modo desarrollo con hot reload |

### Otros

| Comando | Descripcion |
|---------|-------------|
| `openfactu version` | Versiones del sistema |

## Desarrollo remoto de plugins

```bash
# Desde otro ordenador, sube tu plugin automaticamente al guardar
openfactu plugin watch \
  --server http://mi-servidor:3000 \
  --client-id ofk_... \
  --client-secret ofs_...
```

Las dev keys se generan desde la UI del ERP: Plugins > Desarrollo > Generar API Key.

## Uso desde cualquier directorio

```bash
openfactu --path /ruta/a/openfactu migrate

# o con variable de entorno
export OPENFACTU_HOME=/ruta/a/openfactu
openfactu migrate
```

## Requisitos

- Node.js >= 18
- Docker Desktop (para instalar y desplegar)
- Git

## Links

- [GitHub](https://github.com/AngelAcedo12/OpenFactu)
- [Documentacion](https://openfactuerp.org)
- [Marketplace](https://openfactuerp.org/marketplace/)
- [Reportar problema](https://github.com/AngelAcedo12/OpenFactu/issues)
