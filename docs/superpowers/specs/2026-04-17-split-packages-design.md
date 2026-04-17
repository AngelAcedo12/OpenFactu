# Separación de paquetes del monorepo a repos Git independientes

**Fecha**: 2026-04-17
**Estado**: Draft — pendiente de revisión del usuario
**Autor**: Angel Acedo

## Objetivo

Extraer los 6 paquetes publicables del monorepo `OpenFactu` a repositorios Git independientes bajo una organización nueva `openfactu` en GitHub, de modo que cada paquete tenga su propio ciclo de vida (issues, PRs, CI, releases). Las aplicaciones (`apps/server`, `apps/web`) pasarán a consumirlos desde npm como cualquier dependencia externa.

## Motivación

- Control granular por paquete (issues, releases, historial blame)
- Versionado real e independiente (hoy todo evoluciona junto aunque no cambie)
- Alineación del scope npm `@openfactu/*` con el naming de GitHub
- Posibilidad de que terceros contribuyan a un paquete sin clonar todo el ERP

## Alcance

**Dentro del alcance**: separar los 6 paquetes de `packages/`, mover el monorepo principal a la org nueva, dejar el repo principal (`openfactu/platform`) limpio con solo `apps/` + `plugins/` + infra de despliegue.

**Fuera del alcance** (explícitamente no se hace en este spec):
- Crear CI/CD completo en cada repo nuevo (mínimo viable: `tsc --noEmit` + publish-on-tag; el resto queda como follow-up)
- Cambiar el stack de publicación (sigue siendo `npm publish` manual o vía tag)
- Migrar `plugins/` a un repo propio (se queda en el monorepo principal)
- Cambiar versionado (SemVer actual se mantiene; los paquetes siguen en `0.0.x`)

## Decisiones tomadas durante el brainstorming

| Decisión | Elección | Razón |
|---|---|---|
| Forma de separación | Repos Git independientes, apps consumen desde npm | Los paquetes ya están publicados en npm; no hay fricción |
| Preservación de historial | Sí, con `git filter-repo --path packages/<nombre>` | Mantiene blame y trazabilidad |
| Host | GitHub, org nueva `openfactu` (a crear) | Coincide con el scope npm `@openfactu/*` |
| Qué queda en repo principal | `apps/` + `plugins/` + infra | Los plugins son runtime del ERP, no librerías publicables |
| Monorepo principal | Se transfiere a `openfactu/platform` | Unificar todo bajo la org |
| Workspaces | Se reducen a `apps/*` y `plugins/*` en el root post-split | `packages/*` desaparece |
| Código en npm vs local | Todos los paquetes publicados están al día | No hace falta bump-and-publish previo |

## Arquitectura resultante

### Mapa de repos

| Ubicación actual | Repo nuevo | Paquete npm (ya existe) |
|---|---|---|
| `AngelAcedo12/OpenFactu` (monorepo, queda `apps/` + `plugins/`) | `openfactu/platform` | — |
| `packages/cli` | `openfactu/cli` | `@openfactu/cli` |
| `packages/common` | `openfactu/common` | `@openfactu/common` |
| `packages/openfactu-sdk` | `openfactu/sdk` (renombrado) | `@openfactu/sdk` |
| `packages/pdf` | `openfactu/pdf` | `@openfactu/pdf` |
| `packages/plugin-sdk` | `openfactu/plugin-sdk` | `@openfactu/plugin-sdk` |
| `packages/ui` | `openfactu/ui` | `@openfactu/ui` |

La carpeta `packages/openfactu-sdk/` se renombra a nivel repo → `openfactu/sdk` (el paquete npm siempre se llamó `@openfactu/sdk`).

### Contenido del repo principal tras el split

```
openfactu/platform/
├── apps/
│   ├── server/
│   └── web/
├── plugins/
├── docker-compose.yml
├── storage/           (gitignored, excepto estructura base)
├── scripts/
├── examples/
├── package.json       (workspaces: ["apps/*", "plugins/*"])
└── README.md
```

### Flujo de consumo

- **Desarrollo normal de las apps**: `npm install` en el root trae `@openfactu/ui`, `@openfactu/common`, etc. desde npm. No requiere workspaces locales ni builds cruzados.
- **Iteración paquete + app simultánea**: `npm link` puntual (detallado en sección de flujo de desarrollo).

## Procedimiento de migración por paquete

Para cada uno de los 6 paquetes, se ejecutan estos pasos:

1. **Pre-check**: verificar con `git log --follow -- packages/<nombre>` que no hay renombrados antiguos perdidos. Anotar casos especiales.
2. **Clonar copia temporal** del monorepo a `/tmp/split-<nombre>`.
3. **Filtrar historial** con `git filter-repo --path packages/<nombre>`. Deja solo commits que han tocado esa carpeta.
4. **Mover al root**: `git mv packages/<nombre>/* .` + `git mv packages/<nombre>/.* .` (archivos ocultos) + `git rm -r packages`. Commit: `chore: mover contenido al root del paquete`.
5. **Ajustes específicos del paquete**:
   - Añadir `LICENSE` (MIT, a confirmar).
   - Verificar/actualizar `README.md`.
   - Verificar `.gitignore` adecuado (`node_modules/`, `dist/`).
6. **Crear repo vacío en GitHub** `openfactu/<nombre>` (sin README ni licencia inicial).
7. **Empujar**: `git remote add origin git@github.com:openfactu/<nombre>.git && git push -u origin main`.
8. **CI mínimo** (opcional en esta fase, pero recomendado): GitHub Action con `tsc --noEmit` en push a main y `npm publish` al crear un tag `v*`.

### Orden de ejecución

Los 6 paquetes no tienen apenas dependencias internas entre sí (verificado en `package.json`). El orden pragmático:

1. `sdk` (cero deps internas)
2. `pdf` (cero deps internas)
3. `common` (cero deps internas)
4. `plugin-sdk` (cero deps internas)
5. `ui` (cero deps internas; depende de `react-router-dom`, `lucide-react` — externas)
6. `cli` (cero deps internas; depende de `drizzle-orm`, `pg` — externas)
7. **Cleanup del monorepo principal** (PR único, ver siguiente sección)
8. **Transferir `AngelAcedo12/OpenFactu` → `openfactu/platform`** (GitHub Settings → Transfer ownership).

## Cleanup del monorepo principal (PR único)

Cambios en un solo PR tras subir los 6 repos:

1. **Eliminar** la carpeta `packages/` completa.
2. **Root `package.json`**: quitar `"packages/*"` del array `workspaces`. Queda `["apps/*", "plugins/*"]`.
3. **`apps/server/package.json`**: reemplazar referencias internas por versiones npm publicadas (`"@openfactu/pdf": "^0.0.2"`, etc.).
4. **`apps/web/package.json`**: igual con `@openfactu/common`, `@openfactu/ui`, `@openfactu/plugin-sdk`.
5. **Dockerfiles** (`apps/server/Dockerfile`, `apps/web/Dockerfile`): eliminar los `COPY packages ./packages` y los `RUN cd packages/<x> && npm run build || true`. `npm install` se encarga del resto.
6. **Regenerar `package-lock.json`** con `npm install` limpio.
7. **Verificar plugins y examples**: grep en `plugins/` y `examples/` por dependencias `file:` o workspace que apunten a `packages/*`; migrar a npm si aparecen.
8. **Probar deploy completo**: `docker compose build server web && docker compose up -d` + smoke test (login, home, plugins, clientes).

## Flujo de desarrollo local post-split

### Trabajo normal en `apps/*`

Sin pasos adicionales. `npm install` desde el root del monorepo principal baja los paquetes de npm.

### Iteración simultánea paquete + app

```bash
# Terminal 1 — en el repo del paquete
cd ~/dev/openfactu-ui
npm run build    # o npm run dev si tiene watcher
npm link

# Terminal 2 — en el repo de la app
cd ~/dev/openfactu-platform/apps/web
npm link @openfactu/ui

# Cuando acabas:
cd ~/dev/openfactu-ui
npm version patch && npm publish

cd ~/dev/openfactu-platform
npm install @openfactu/ui@latest
git commit -am "chore: bump @openfactu/ui"
```

### Alternativa: prerelease

Si algún día se prefiere un flujo más estricto (por ejemplo, para validar antes de publicar estable):

```bash
cd ~/dev/openfactu-ui
npm version prerelease --preid=rc
npm publish --tag next

cd ~/dev/openfactu-platform
npm install @openfactu/ui@next
# Probar, validar
cd ~/dev/openfactu-ui
npm version patch   # promueve a estable
npm publish         # --tag latest por defecto
```

## Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| `plugins/` y `examples/` usan rutas workspace a `packages/*` | Media | Medio (build falla) | Grep pre-cleanup; migrar a deps npm |
| `git filter-repo` pierde commits tras renombrados antiguos | Baja | Bajo (historial parcial) | `git log --follow` en pre-check; si aparece algo, añadir `--path` adicional |
| Transferencia del repo principal rompe remotes locales | Alta | Bajo | GitHub redirige durante un tiempo; `git remote set-url origin` como fix |
| CI de publish-on-tag publica versiones rotas | Baja | Alto (npm sin rollback fácil) | El CI inicial es solo `tsc --noEmit`; publish queda manual hasta validar |
| Los apps pinnean versiones demasiado bajas y rompen | Baja | Medio | Usar `^0.0.x` no `0.0.x`; en la primera iteración, fijar versiones exactas si hace falta |

## Criterios de aceptación

- [ ] 6 repos nuevos en `github.com/openfactu/*` con historial filtrado y contenido en el root.
- [ ] `docker compose up -d` arranca y funciona sin `packages/` en el árbol.
- [ ] Login, creación de factura, activación de plugin y carga del dashboard funcionan tras el split (smoke test).
- [ ] `AngelAcedo12/OpenFactu` transferido a `openfactu/platform`.
- [ ] Commit de cleanup en `main` con mensaje en español y merge `--no-ff` (según preferencia del usuario).

## Tareas pendientes del usuario (pre-ejecución)

- [ ] **Crear la organización GitHub `openfactu`** (todavía no existe).
- [ ] Confirmar nombre del repo principal: propuesta `openfactu/platform` (alternativas: `core`, `app`, `erp`, `openfactu`).
- [ ] Confirmar licencia para los paquetes nuevos (propuesta: MIT).

## Follow-ups fuera de este spec

- CI completo por paquete (lint, tests, publish-on-tag firmado).
- Documentar el proceso de contribución externa en cada repo.
- Considerar `changesets` o similar si el versionado manual se vuelve una molestia.
- Evaluar mover `plugins/` a `openfactu/plugins-official` si crecen mucho.
