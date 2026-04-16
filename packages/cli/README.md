# @openfactu/cli

CLI oficial para instalar, gestionar y desplegar [OpenFactu](https://github.com/AngelAcedo12/OpenFactu) -- ERP de facturación open source.

## Instalacion

```bash
npm i -g @openfactu/cli
```

## Inicio rapido

```bash
# Descargar e instalar OpenFactu (te deja elegir version)
openfactu install

# Configurar base de datos y usuario admin
openfactu setup

# Aplicar migraciones
openfactu migrate

# Desplegar en red local o internet
openfactu deploy
```

## Comandos

### Instalacion y actualizacion

| Comando | Descripcion |
|---------|-------------|
| `openfactu install [dir]` | Descarga e instala OpenFactu. Muestra las releases de GitHub para elegir version. Soporta Docker en Windows/Mac/Linux. |
| `openfactu update` | Actualiza a la ultima version desde GitHub sin perder datos (plugins, storage, .env se preservan). |
| `openfactu update:check` | Comprueba si hay versiones nuevas disponibles. |

```bash
# Instalar una release especifica
openfactu install ./mi-erp --tag v1.2.0

# Instalar desde una branch
openfactu install ./mi-erp --branch develop

# Actualizar la instalacion actual
openfactu update
```

### Despliegue

| Comando | Descripcion |
|---------|-------------|
| `openfactu deploy` | Wizard para configurar acceso externo: red local, dominio publico o localhost. Genera `docker-compose.prod.yml`. |
| `openfactu deploy:status` | Muestra el estado de los contenedores Docker y las URLs de acceso. |

```bash
# Configurar para que sea accesible en la red
openfactu deploy

# Ver estado de los servicios
openfactu deploy:status
```

### Base de datos

| Comando | Descripcion |
|---------|-------------|
| `openfactu setup` | Configuracion inicial: verifica BD, crea admin, primer tenant. |
| `openfactu migrate` | Ejecuta migraciones pendientes en todos los tenants. |
| `openfactu migrate:status` | Muestra tabla con estado de migraciones por tenant. |

```bash
# Migrar solo un tenant especifico
openfactu migrate --tenant "Mi Empresa"

# Ver que migraciones faltan
openfactu migrate:status
```

### Tenants (empresas)

| Comando | Descripcion |
|---------|-------------|
| `openfactu tenant list` | Lista todas las empresas. |
| `openfactu tenant create [nombre]` | Crea una empresa nueva con schema y migraciones. |
| `openfactu tenant sync [nombre]` | Sincroniza migraciones de un tenant o todos. |

### Plugins

| Comando | Descripcion |
|---------|-------------|
| `openfactu plugin list` | Lista plugins instalados con su estado por tenant. |

### Otros

| Comando | Descripcion |
|---------|-------------|
| `openfactu version` | Muestra versiones del CLI, server, web y Node. |

## Uso desde cualquier directorio

El CLI detecta automaticamente la instalacion de OpenFactu. Si no estas dentro del proyecto:

```bash
# Opcion 1: flag --path
openfactu --path /ruta/a/openfactu migrate

# Opcion 2: variable de entorno
export OPENFACTU_HOME=/ruta/a/openfactu
openfactu migrate
```

## Requisitos

- Node.js >= 18
- Docker Desktop (para instalar y desplegar)
- Git (para descargar releases)

## Links

- [GitHub](https://github.com/AngelAcedo12/OpenFactu)
- [Reportar un problema](https://github.com/AngelAcedo12/OpenFactu/issues)
