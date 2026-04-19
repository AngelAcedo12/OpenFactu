# Plan de separación de paquetes a repos Git independientes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extraer los 6 paquetes de `packages/` del monorepo a repos Git propios bajo la org `OpenFactu`, conservar historial con `git filter-repo`, y dejar el monorepo principal consumiendo las versiones npm publicadas.

**Architecture:** Para cada paquete: clon limpio del monorepo → `git filter-repo --subdirectory-filter` (extrae subcarpeta al root conservando commits relevantes) → push al repo vacío en `github.com/OpenFactu/<nombre>`. Al final, PR de cleanup en el monorepo que elimina `packages/`, ajusta `package.json` de las apps y los Dockerfiles, y regenera el lockfile. Transferencia final del repo principal a `OpenFactu/platform`.

**Tech Stack:** git, git-filter-repo, npm, GitHub CLI (`gh`), Docker Compose, Node 20.

---

## Fase 0 — Preparativos

### Tarea 0.1: Instalar git-filter-repo

**Files:** (ninguno, instalación de herramienta)

- [ ] **Paso 1: Comprobar si ya está instalado**

Ejecutar: `git filter-repo --version`
Esperado: imprime versión (p.ej. `2.38.0`) — si responde, saltar al paso 3 de la tarea.
Si no: `git: 'filter-repo' is not a git command` → seguir al paso 2.

- [ ] **Paso 2: Instalar con apt (Pop!_OS / Ubuntu / Debian)**

Ejecutar: `sudo apt update && sudo apt install -y git-filter-repo`
Esperado: instalación sin errores.

Si apt no lo encuentra, alternativa con pip:
```bash
sudo apt install -y python3-pip
pip3 install --user git-filter-repo
export PATH="$HOME/.local/bin:$PATH"
```
Añadir `export PATH="$HOME/.local/bin:$PATH"` al `~/.zshrc` si queremos persistencia.

- [ ] **Paso 3: Verificar instalación**

Ejecutar: `git filter-repo --version`
Esperado: imprime una versión `>= 2.30`.

### Tarea 0.2: Verificar acceso a GitHub CLI y org OpenFactu

**Files:** (ninguno)

- [ ] **Paso 1: Verificar autenticación gh**

Ejecutar: `gh auth status`
Esperado: `✓ Logged in to github.com account ... (oauth_token)`.
Si no está logueado: `gh auth login` (seguir las instrucciones interactivas, elegir HTTPS + browser).

- [ ] **Paso 2: Verificar que la org OpenFactu existe y somos admin**

Ejecutar: `gh api orgs/OpenFactu --jq '.login, .type'`
Esperado: salida con dos líneas:
```
OpenFactu
Organization
```
Si devuelve 404: crear la org en github.com/organizations/new antes de continuar.

### Tarea 0.3: Verificar limpieza del monorepo

**Files:** (ninguno)

- [ ] **Paso 1: Verificar working tree limpio**

Ejecutar: `cd /home/angel/Escritorio/dev/OpenFactu && git status --porcelain`
Esperado: salida vacía (sin archivos modificados).
Si hay cambios pendientes: commitear o stash antes de continuar.

- [ ] **Paso 2: Verificar que estás en main actualizado**

Ejecutar: `git branch --show-current && git fetch && git status -b --short | head -1`
Esperado:
```
main
## main...origin/main
```
(ningún "ahead" ni "behind"). Si hay desfase: `git pull --rebase origin main`.

### Tarea 0.4: Crear plantilla LICENSE reutilizable

**Files:** Create `/tmp/openfactu-LICENSE.txt`

- [ ] **Paso 1: Crear plantilla**

Crear `/tmp/openfactu-LICENSE.txt` con este contenido exacto:

```
MIT License

Copyright (c) 2026 Angel Acedo

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Paso 2: Verificar**

Ejecutar: `wc -l /tmp/openfactu-LICENSE.txt`
Esperado: `21 /tmp/openfactu-LICENSE.txt`.

### Tarea 0.5: Backup de seguridad del monorepo

**Files:** (ninguno — operación fuera del repo)

- [ ] **Paso 1: Crear tarball de backup del monorepo completo**

Ejecutar:
```bash
cd /home/angel/Escritorio/dev
tar --exclude='node_modules' --exclude='.git/objects/pack' -czf /tmp/OpenFactu-backup-$(date +%Y%m%d-%H%M%S).tar.gz OpenFactu
ls -lh /tmp/OpenFactu-backup-*.tar.gz | tail -1
```
Esperado: un archivo `.tar.gz` de tamaño razonable (decenas-cientos de MB).

---

## Fase 1 — Extraer `sdk` (desde `packages/openfactu-sdk`)

### Tarea 1.1: Clonar monorepo aislado para filtrar

**Files:** (ninguno)

- [ ] **Paso 1: Clonar con `--no-local` para evitar hardlinks**

Ejecutar:
```bash
rm -rf /tmp/split-sdk
git clone --no-local /home/angel/Escritorio/dev/OpenFactu /tmp/split-sdk
cd /tmp/split-sdk
git log --oneline | wc -l
```
Esperado: número > 0 (total de commits del monorepo).

### Tarea 1.2: Filtrar historial a solo `packages/openfactu-sdk`

**Files:** (ninguno — reescribe `.git`)

- [ ] **Paso 1: Ejecutar `filter-repo` con `--subdirectory-filter`**

Ejecutar:
```bash
cd /tmp/split-sdk
git filter-repo --subdirectory-filter packages/openfactu-sdk
```
Esperado: salida con `Parsed N commits... New history written in X.Xs...`.

- [ ] **Paso 2: Verificar que solo quedan archivos del paquete en el root**

Ejecutar: `ls /tmp/split-sdk`
Esperado: ver `package.json`, `README.md`, `src/`, `tsconfig.json` (o los que tuviera el paquete) — **no** debe aparecer ninguna otra carpeta ni `packages/`.

- [ ] **Paso 3: Verificar historial no vacío**

Ejecutar: `cd /tmp/split-sdk && git log --oneline | wc -l`
Esperado: número > 0.

### Tarea 1.3: Añadir LICENSE MIT

**Files:** Create `/tmp/split-sdk/LICENSE`

- [ ] **Paso 1: Copiar plantilla**

Ejecutar: `cp /tmp/openfactu-LICENSE.txt /tmp/split-sdk/LICENSE`
Esperado: sin salida.

- [ ] **Paso 2: Commit**

Ejecutar:
```bash
cd /tmp/split-sdk
git add LICENSE
git commit -m "chore: añadir LICENSE MIT"
```
Esperado: `1 file changed, 21 insertions(+)`.

### Tarea 1.4: Crear repo vacío en GitHub y empujar

**Files:** (ninguno)

- [ ] **Paso 1: Crear repo remoto vacío `OpenFactu/sdk`**

Ejecutar: `gh repo create OpenFactu/sdk --public --description "SDK oficial para integración externa con OpenFactu ERP"`
Esperado: `https://github.com/OpenFactu/sdk` impreso.

- [ ] **Paso 2: Añadir remote y empujar**

Ejecutar:
```bash
cd /tmp/split-sdk
git remote add origin git@github.com:OpenFactu/sdk.git
git branch -M main
git push -u origin main
```
Esperado: `Branch 'main' set up to track remote branch 'main' from 'origin'.`

- [ ] **Paso 3: Verificar remoto**

Ejecutar: `git ls-remote origin main | awk '{print $1}'`
Esperado: un hash SHA; comparar con `git rev-parse HEAD` → deben coincidir.

### Tarea 1.5: Limpieza temporal

**Files:** (ninguno)

- [ ] **Paso 1: Borrar clon temporal**

Ejecutar: `rm -rf /tmp/split-sdk`
Esperado: sin salida.

---

## Fase 2 — Extraer `pdf`

### Tarea 2.1: Clonar monorepo aislado

**Files:** (ninguno)

- [ ] **Paso 1: Clonar con `--no-local`**

Ejecutar:
```bash
rm -rf /tmp/split-pdf
git clone --no-local /home/angel/Escritorio/dev/OpenFactu /tmp/split-pdf
cd /tmp/split-pdf
git log --oneline | wc -l
```
Esperado: número > 0.

### Tarea 2.2: Filtrar a solo `packages/pdf`

- [ ] **Paso 1: Ejecutar filter-repo**

Ejecutar:
```bash
cd /tmp/split-pdf
git filter-repo --subdirectory-filter packages/pdf
```
Esperado: `New history written`.

- [ ] **Paso 2: Verificar contenido**

Ejecutar: `ls /tmp/split-pdf`
Esperado: `package.json`, `src/`, `tsconfig.json` (sin `packages/`).

- [ ] **Paso 3: Verificar historial**

Ejecutar: `cd /tmp/split-pdf && git log --oneline | wc -l`
Esperado: número > 0.

### Tarea 2.3: Añadir LICENSE MIT y ajustar package.json

**Files:** Create `/tmp/split-pdf/LICENSE`, Modify `/tmp/split-pdf/package.json`

- [ ] **Paso 1: Copiar plantilla LICENSE**

Ejecutar: `cp /tmp/openfactu-LICENSE.txt /tmp/split-pdf/LICENSE`

- [ ] **Paso 2: Quitar `"private": true` del package.json**

Editar `/tmp/split-pdf/package.json`: eliminar la línea `"private": true,` (el paquete ya existe en npm como `@openfactu/pdf` público).

- [ ] **Paso 3: Commit**

Ejecutar:
```bash
cd /tmp/split-pdf
git add LICENSE package.json
git commit -m "chore: añadir LICENSE MIT y quitar private"
```

### Tarea 2.4: Crear repo y empujar

- [ ] **Paso 1: Crear repo**

Ejecutar: `gh repo create OpenFactu/pdf --public --description "Generación de PDFs para documentos comerciales de OpenFactu"`

- [ ] **Paso 2: Empujar**

Ejecutar:
```bash
cd /tmp/split-pdf
git remote add origin git@github.com:OpenFactu/pdf.git
git branch -M main
git push -u origin main
```
Esperado: push sin errores.

- [ ] **Paso 3: Verificar**

Ejecutar: `git ls-remote origin main | awk '{print $1}' && git rev-parse HEAD`
Esperado: los dos hashes coinciden.

### Tarea 2.5: Limpieza

- [ ] **Paso 1**: `rm -rf /tmp/split-pdf`

---

## Fase 3 — Extraer `common`

### Tarea 3.1: Clonar

- [ ] **Paso 1: Clonar**

Ejecutar:
```bash
rm -rf /tmp/split-common
git clone --no-local /home/angel/Escritorio/dev/OpenFactu /tmp/split-common
```
Esperado: clon creado.

### Tarea 3.2: Filtrar a `packages/common`

- [ ] **Paso 1: filter-repo**

Ejecutar:
```bash
cd /tmp/split-common
git filter-repo --subdirectory-filter packages/common
```

- [ ] **Paso 2: Verificar**

Ejecutar: `ls /tmp/split-common`
Esperado: `package.json`, `src/`, `tsconfig.json`.

### Tarea 3.3: Añadir LICENSE MIT

- [ ] **Paso 1: Copiar plantilla**

Ejecutar: `cp /tmp/openfactu-LICENSE.txt /tmp/split-common/LICENSE`

- [ ] **Paso 2: Commit**

Ejecutar:
```bash
cd /tmp/split-common
git add LICENSE
git commit -m "chore: añadir LICENSE MIT"
```

### Tarea 3.4: Crear repo y empujar

- [ ] **Paso 1: Crear**

Ejecutar: `gh repo create OpenFactu/common --public --description "Tipos y utilidades compartidas entre frontend y backend de OpenFactu"`

- [ ] **Paso 2: Empujar**

Ejecutar:
```bash
cd /tmp/split-common
git remote add origin git@github.com:OpenFactu/common.git
git branch -M main
git push -u origin main
```

- [ ] **Paso 3: Verificar**

Ejecutar: `git ls-remote origin main | awk '{print $1}' && git rev-parse HEAD`
Esperado: hashes coinciden.

### Tarea 3.5: Limpieza

- [ ] **Paso 1**: `rm -rf /tmp/split-common`

---

## Fase 4 — Extraer `plugin-sdk`

### Tarea 4.1: Clonar

- [ ] **Paso 1**:

Ejecutar:
```bash
rm -rf /tmp/split-plugin-sdk
git clone --no-local /home/angel/Escritorio/dev/OpenFactu /tmp/split-plugin-sdk
```

### Tarea 4.2: Filtrar

- [ ] **Paso 1**:

Ejecutar:
```bash
cd /tmp/split-plugin-sdk
git filter-repo --subdirectory-filter packages/plugin-sdk
ls
```
Esperado: `package.json`, `src/` (o similar), `README.md`.

### Tarea 4.3: LICENSE

- [ ] **Paso 1: Copiar plantilla**

Ejecutar: `cp /tmp/openfactu-LICENSE.txt /tmp/split-plugin-sdk/LICENSE`

- [ ] **Paso 2: Commit**

Ejecutar:
```bash
cd /tmp/split-plugin-sdk
git add LICENSE
git commit -m "chore: añadir LICENSE MIT"
```

### Tarea 4.4: Crear repo y empujar

- [ ] **Paso 1**:

Ejecutar: `gh repo create OpenFactu/plugin-sdk --public --description "SDK oficial para desarrollo de plugins de OpenFactu ERP"`

- [ ] **Paso 2**:

Ejecutar:
```bash
cd /tmp/split-plugin-sdk
git remote add origin git@github.com:OpenFactu/plugin-sdk.git
git branch -M main
git push -u origin main
```

- [ ] **Paso 3**:

Ejecutar: `git ls-remote origin main | awk '{print $1}' && git rev-parse HEAD`
Esperado: coinciden.

### Tarea 4.5: Limpieza

- [ ] **Paso 1**: `rm -rf /tmp/split-plugin-sdk`

---

## Fase 5 — Extraer `ui`

### Tarea 5.1: Clonar

- [ ] **Paso 1**:

Ejecutar:
```bash
rm -rf /tmp/split-ui
git clone --no-local /home/angel/Escritorio/dev/OpenFactu /tmp/split-ui
```

### Tarea 5.2: Filtrar

- [ ] **Paso 1**:

Ejecutar:
```bash
cd /tmp/split-ui
git filter-repo --subdirectory-filter packages/ui
ls
```
Esperado: `package.json`, `src/`, `tsconfig.json`, `tailwind.config.js` si lo tuviera.

### Tarea 5.3: LICENSE

- [ ] **Paso 1: Copiar plantilla**

Ejecutar: `cp /tmp/openfactu-LICENSE.txt /tmp/split-ui/LICENSE`

- [ ] **Paso 2: Commit**

Ejecutar:
```bash
cd /tmp/split-ui
git add LICENSE
git commit -m "chore: añadir LICENSE MIT"
```

### Tarea 5.4: Crear repo y empujar

- [ ] **Paso 1**:

Ejecutar: `gh repo create OpenFactu/ui --public --description "Librería de componentes UI oficial de OpenFactu"`

- [ ] **Paso 2**:

Ejecutar:
```bash
cd /tmp/split-ui
git remote add origin git@github.com:OpenFactu/ui.git
git branch -M main
git push -u origin main
```

- [ ] **Paso 3**:

Ejecutar: `git ls-remote origin main | awk '{print $1}' && git rev-parse HEAD`
Esperado: coinciden.

### Tarea 5.5: Limpieza

- [ ] **Paso 1**: `rm -rf /tmp/split-ui`

---

## Fase 6 — Extraer `cli`

### Tarea 6.1: Clonar

- [ ] **Paso 1**:

Ejecutar:
```bash
rm -rf /tmp/split-cli
git clone --no-local /home/angel/Escritorio/dev/OpenFactu /tmp/split-cli
```

### Tarea 6.2: Filtrar

- [ ] **Paso 1**:

Ejecutar:
```bash
cd /tmp/split-cli
git filter-repo --subdirectory-filter packages/cli
ls
```
Esperado: `package.json`, `bin/`, `src/`, `README.md`.

### Tarea 6.3: LICENSE

- [ ] **Paso 1: Copiar plantilla**

Ejecutar: `cp /tmp/openfactu-LICENSE.txt /tmp/split-cli/LICENSE`

- [ ] **Paso 2: Commit**

Ejecutar:
```bash
cd /tmp/split-cli
git add LICENSE
git commit -m "chore: añadir LICENSE MIT"
```

### Tarea 6.4: Crear repo y empujar

- [ ] **Paso 1**:

Ejecutar: `gh repo create OpenFactu/cli --public --description "CLI oficial de administración de OpenFactu ERP"`

- [ ] **Paso 2**:

Ejecutar:
```bash
cd /tmp/split-cli
git remote add origin git@github.com:OpenFactu/cli.git
git branch -M main
git push -u origin main
```

- [ ] **Paso 3**:

Ejecutar: `git ls-remote origin main | awk '{print $1}' && git rev-parse HEAD`
Esperado: coinciden.

### Tarea 6.5: Limpieza

- [ ] **Paso 1**: `rm -rf /tmp/split-cli`

---

## Fase 7 — Cleanup del monorepo (PR único)

Todas las tareas de esta fase se hacen en `/home/angel/Escritorio/dev/OpenFactu` en una rama nueva `chore/remove-packages`.

### Tarea 7.1: Crear rama de trabajo

- [ ] **Paso 1: Crear rama**

Ejecutar:
```bash
cd /home/angel/Escritorio/dev/OpenFactu
git checkout -b chore/remove-packages
```
Esperado: `Switched to a new branch 'chore/remove-packages'`.

### Tarea 7.2: Eliminar carpeta `packages/`

- [ ] **Paso 1: Borrar con git rm**

Ejecutar: `git rm -r packages`
Esperado: decenas/cientos de líneas `rm 'packages/...'` sin errores.

### Tarea 7.3: Actualizar `package.json` raíz (workspaces)

**Files:** Modify `/home/angel/Escritorio/dev/OpenFactu/package.json`

- [ ] **Paso 1: Editar workspaces**

En `package.json`, cambiar:
```json
"workspaces": [
    "apps/*",
    "packages/*",
    "plugins/*"
  ],
```
por:
```json
"workspaces": [
    "apps/*",
    "plugins/*"
  ],
```

- [ ] **Paso 2: Verificar**

Ejecutar: `grep -A3 '"workspaces"' package.json`
Esperado: no aparece `"packages/*"`.

### Tarea 7.4: Actualizar `apps/server/package.json`

**Files:** Modify `/home/angel/Escritorio/dev/OpenFactu/apps/server/package.json`

- [ ] **Paso 1: Cambiar `@openfactu/pdf: "*"` a versión npm**

Editar `apps/server/package.json`, línea 14:
```json
"@openfactu/pdf": "*",
```
por:
```json
"@openfactu/pdf": "^0.0.2",
```

- [ ] **Paso 2: Verificar**

Ejecutar: `grep "@openfactu" apps/server/package.json`
Esperado: `"@openfactu/pdf": "^0.0.2",`.

### Tarea 7.5: Actualizar `apps/web/package.json`

**Files:** Modify `/home/angel/Escritorio/dev/OpenFactu/apps/web/package.json`

- [ ] **Paso 1: Cambiar `@openfactu/common` y `@openfactu/ui` a versiones npm**

Editar `apps/web/package.json`, líneas 14-15:
```json
"@openfactu/common": "*",
"@openfactu/ui": "*",
```
por:
```json
"@openfactu/common": "^0.0.2",
"@openfactu/ui": "^0.0.2",
```

- [ ] **Paso 2: Añadir `@openfactu/pdf` (lo usa `apps/web/src/utils/visualTemplateBuilder.ts`)**

En `apps/web/package.json` dependencies, añadir tras `@openfactu/common`:
```json
"@openfactu/pdf": "^0.0.2",
```

- [ ] **Paso 3: Verificar**

Ejecutar: `grep "@openfactu" apps/web/package.json`
Esperado:
```
"@openfactu/common": "^0.0.2",
"@openfactu/pdf": "^0.0.2",
"@openfactu/ui": "^0.0.2",
```

### Tarea 7.6: Limpiar aliases en `apps/web/vite.config.ts`

**Files:** Modify `/home/angel/Escritorio/dev/OpenFactu/apps/web/vite.config.ts`

- [ ] **Paso 1: Eliminar el bloque `resolve.alias`**

Reemplazar todo el contenido del archivo por:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
```
(Se eliminan el `import path` y el bloque `resolve: { alias: ... }`.)

- [ ] **Paso 2: Verificar**

Ejecutar: `grep -c "packages" apps/web/vite.config.ts`
Esperado: `0`.

### Tarea 7.7: Limpiar paths en `apps/web/tsconfig.app.json`

**Files:** Modify `/home/angel/Escritorio/dev/OpenFactu/apps/web/tsconfig.app.json`

- [ ] **Paso 1: Eliminar los paths a `../../packages/*`**

Editar `apps/web/tsconfig.app.json`. Dentro de `compilerOptions`, **eliminar** estas líneas:
```json
"baseUrl": ".",
"paths": {
  "@openfactu/common": ["../../packages/common/src/index.ts"],
  "@openfactu/common/*": ["../../packages/common/src/*"],
  "@openfactu/ui": ["../../packages/ui/src/index.ts"],
  "@openfactu/ui/*": ["../../packages/ui/src/*"]
}
```
Dejar `"ignoreDeprecations": "6.0",` como última propiedad antes del cierre de `compilerOptions`. Asegurarse de que la coma final queda correcta.

- [ ] **Paso 2: Verificar**

Ejecutar: `grep -c "packages" apps/web/tsconfig.app.json`
Esperado: `0`.

### Tarea 7.8: Actualizar `apps/server/Dockerfile`

**Files:** Modify `/home/angel/Escritorio/dev/OpenFactu/apps/server/Dockerfile`

- [ ] **Paso 1: Eliminar COPY y RUN de packages**

Reemplazar todo el contenido por:
```dockerfile
FROM node:20-alpine

WORKDIR /app

# 1. Copiar manifiestos y server
COPY package*.json ./
COPY apps/server ./apps/server

# 2. Instalar dependencias (incluye @openfactu/* desde npm)
RUN npm install

# 3. Compilar el servidor
WORKDIR /app/apps/server
RUN npm run build

# 4. Ejecutar
CMD ["npm", "start"]
```

- [ ] **Paso 2: Verificar**

Ejecutar: `grep -c "packages" apps/server/Dockerfile`
Esperado: `0`.

### Tarea 7.9: Actualizar `apps/web/Dockerfile`

**Files:** Modify `/home/angel/Escritorio/dev/OpenFactu/apps/web/Dockerfile`

- [ ] **Paso 1: Eliminar COPY y RUN de packages**

Reemplazar todo el contenido por:
```dockerfile
FROM node:20-alpine AS builder

ARG VITE_API_URL=http://localhost:3000

WORKDIR /app
COPY package*.json ./
COPY apps/web ./apps/web

RUN npm install

ENV VITE_API_URL=$VITE_API_URL
WORKDIR /app/apps/web
RUN npm run build

FROM nginx:alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

- [ ] **Paso 2: Verificar**

Ejecutar: `grep -c "packages" apps/web/Dockerfile`
Esperado: `0`.

### Tarea 7.10: Regenerar lockfile root

- [ ] **Paso 1: Borrar y regenerar**

Ejecutar:
```bash
cd /home/angel/Escritorio/dev/OpenFactu
rm -rf node_modules package-lock.json apps/*/node_modules apps/*/package-lock.json
npm install
```
Esperado: instalación completa sin errores críticos. Warnings de peerDependencies son aceptables.

- [ ] **Paso 2: Verificar que las apps resuelven los paquetes desde npm**

Ejecutar: `ls node_modules/@openfactu`
Esperado: `common  pdf  plugin-sdk  ui` (o similar, paquetes instalados desde npm).

### Tarea 7.11: Smoke test local (typecheck)

- [ ] **Paso 1: Typecheck del server**

Ejecutar:
```bash
cd /home/angel/Escritorio/dev/OpenFactu/apps/server
npx tsc --noEmit
```
Esperado: sin salida (sin errores). Si hay errores de tipo: leer y corregir (posiblemente imports rotos).

- [ ] **Paso 2: Typecheck del web**

Ejecutar:
```bash
cd /home/angel/Escritorio/dev/OpenFactu/apps/web
npx tsc -p tsconfig.app.json --noEmit
```
Esperado: sin salida.

### Tarea 7.12: Smoke test Docker

- [ ] **Paso 1: Rebuild imágenes**

Ejecutar:
```bash
cd /home/angel/Escritorio/dev/OpenFactu
docker compose build server web
```
Esperado: build exitoso para ambos servicios.

- [ ] **Paso 2: Levantar servicios**

Ejecutar: `docker compose up -d`
Esperado: `Container openfactu-server-1 Started`, `Container openfactu-web-1 Started`, `Container openfactu-db-1 Started`.

- [ ] **Paso 3: Esperar que el server esté listo y probar endpoint**

Ejecutar:
```bash
sleep 10
curl -s http://localhost:8080/api/setup/status | head -c 200
```
Esperado: JSON con `"configured": true|false` — cualquier respuesta JSON sin error HTTP valida el smoke test.

- [ ] **Paso 4: Probar login con admin existente**

Ejecutar:
```bash
curl -s -X POST http://localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin","password":"admin123"}' | head -c 200
```
Esperado: JSON con `"token"` o, si el admin fue reemplazado por setup, `"Credenciales inválidas"` (401). Ambos validan que el backend responde.

### Tarea 7.13: Commit del cleanup

- [ ] **Paso 1: Stage de todos los cambios**

Ejecutar:
```bash
cd /home/angel/Escritorio/dev/OpenFactu
git add -A
git status --short | head -30
```
Esperado: ver archivos modificados/borrados esperados (Dockerfiles, package.json, vite.config.ts, tsconfig.app.json, package-lock.json, packages/ borrada).

- [ ] **Paso 2: Commit**

Ejecutar:
```bash
git commit -m "$(cat <<'EOF'
chore: separar packages a repos independientes

Los 6 paquetes @openfactu/* se han movido a repos propios bajo la org
OpenFactu y se consumen ahora desde npm. Cambios:

- Eliminada carpeta packages/
- Workspaces raíz reducidos a apps/* + plugins/*
- apps/{server,web}/package.json usan versiones npm publicadas
- Dockerfiles ya no compilan paquetes internos
- apps/web: retirados aliases de vite + paths de tsconfig
- package-lock.json regenerado

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```
Esperado: un commit con todos los cambios del cleanup.

### Tarea 7.14: Push rama y abrir PR

- [ ] **Paso 1: Push**

Ejecutar:
```bash
git push -u origin chore/remove-packages
```
Esperado: `Branch 'chore/remove-packages' set up to track ...`.

- [ ] **Paso 2: Abrir PR**

Ejecutar:
```bash
gh pr create --title "chore: separar packages a repos independientes" --body "$(cat <<'EOF'
## Resumen
- Los 6 paquetes \`@openfactu/*\` se migraron a repos Git propios bajo la org \`OpenFactu\` en GitHub.
- Apps consumen ahora las versiones publicadas en npm.
- Se elimina \`packages/\`, los aliases de vite, los paths de tsconfig y los \`COPY packages\` de los Dockerfiles.

## Plan de pruebas
- [x] \`npx tsc --noEmit\` en apps/server y apps/web pasa sin errores.
- [x] \`docker compose build server web\` completa sin fallos.
- [x] \`docker compose up -d\` levanta los tres contenedores.
- [x] \`GET /api/setup/status\` responde JSON válido.
- [x] \`POST /api/auth/login\` responde (token o 401).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
Esperado: URL del PR impresa.

### Tarea 7.15: Merge del PR (manual del usuario)

- [ ] **Paso 1: Mergear el PR con `--no-ff`**

Tras revisión del usuario, ejecutar:
```bash
gh pr merge --merge --delete-branch
```
(Usar `--merge` para forzar merge commit, cumple con la preferencia de `--no-ff` implícita en un merge commit de GitHub.)
Esperado: `Merged pull request #N (chore: separar packages...)`.

---

## Fase 8 — Transferir repo principal a `OpenFactu/platform`

### Tarea 8.1: Renombrar repo en GitHub a `platform`

- [ ] **Paso 1: Rename**

Ejecutar: `gh repo rename platform --repo AngelAcedo12/OpenFactu`
Esperado: `Renamed repository AngelAcedo12/platform`.

### Tarea 8.2: Transferir ownership a la org OpenFactu

- [ ] **Paso 1: Solicitar transferencia por API**

Ejecutar:
```bash
gh api repos/AngelAcedo12/platform/transfer -X POST -f new_owner=OpenFactu
```
Esperado: respuesta JSON con la aceptación pendiente (GitHub puede requerir confirmación de la org por email).

Si la API pide confirmación interactiva: abrir `https://github.com/AngelAcedo12/platform/settings` → "Transfer ownership" y completar manualmente.

### Tarea 8.3: Actualizar remote local

- [ ] **Paso 1: Cambiar origin**

Ejecutar:
```bash
cd /home/angel/Escritorio/dev/OpenFactu
git remote set-url origin git@github.com:OpenFactu/platform.git
git remote -v
```
Esperado:
```
origin	git@github.com:OpenFactu/platform.git (fetch)
origin	git@github.com:OpenFactu/platform.git (push)
```

- [ ] **Paso 2: Verificar conectividad**

Ejecutar: `git fetch origin main`
Esperado: fetch sin errores.

---

## Fase 9 — Verificación final end-to-end

### Tarea 9.1: Listar los 6 repos nuevos

- [ ] **Paso 1: Listar repos de la org**

Ejecutar:
```bash
gh repo list OpenFactu --limit 20 --json name,url --jq '.[] | "\(.name)\t\(.url)"'
```
Esperado: aparecen `sdk`, `pdf`, `common`, `plugin-sdk`, `ui`, `cli` y `platform`.

### Tarea 9.2: Verificar historial preservado en uno de ellos

- [ ] **Paso 1: Ejemplo con `ui`**

Ejecutar:
```bash
gh api repos/OpenFactu/ui/commits --jq '.[].commit.message' | head -5
```
Esperado: imprime al menos 5 commits con mensajes no vacíos — confirma que el historial se preservó.

### Tarea 9.3: Smoke test final del deployment

- [ ] **Paso 1: Clon limpio del nuevo repo platform**

Ejecutar:
```bash
cd /tmp
git clone git@github.com:OpenFactu/platform.git /tmp/platform-verify
cd /tmp/platform-verify
ls
```
Esperado: ver `apps/`, `plugins/`, `docker-compose.yml`, `storage/`, `scripts/` — **sin** `packages/`.

- [ ] **Paso 2: Build limpio**

Ejecutar:
```bash
cd /tmp/platform-verify
cp /home/angel/Escritorio/dev/OpenFactu/.env .env 2>/dev/null || echo "POSTGRES_USER=openfactu
POSTGRES_PASSWORD=openfactu_pass
POSTGRES_DB=openfactudb
SERVER_PORT=3001
WEB_PORT=8081
DB_PORT=5433" > .env
docker compose -p openfactu-verify up -d --build
sleep 15
curl -s http://localhost:8081/api/setup/status
```
Esperado: JSON con estado del setup (configured true/false). Confirma que todo arranca desde cero sin `packages/`.

- [ ] **Paso 3: Limpieza**

Ejecutar:
```bash
cd /tmp/platform-verify
docker compose -p openfactu-verify down -v
rm -rf /tmp/platform-verify
```

---

## Notas y rollback

**Si alguna fase 1-6 falla a mitad**: los paquetes subidos antes no se ven afectados; simplemente reintentar la fase problemática con un `/tmp/split-<x>` nuevo.

**Si la fase 7 falla en smoke test**: los cambios están en rama `chore/remove-packages`, sin mergear. Arreglar y commitear encima; o abandonar la rama (`git checkout main && git branch -D chore/remove-packages`) y los repos separados siguen existiendo como backup.

**Rollback total**: el backup de la Tarea 0.5 contiene el monorepo íntegro. En caso extremo:
```bash
cd /home/angel/Escritorio/dev
rm -rf OpenFactu
tar -xzf /tmp/OpenFactu-backup-*.tar.gz
```

**Los 6 repos separados pueden borrarse con** `gh repo delete OpenFactu/<nombre> --yes` (requiere `gh auth refresh -s delete_repo` primero).
