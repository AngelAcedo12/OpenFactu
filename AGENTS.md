# OpenFactu — Agent instructions

## Dev commands

```sh
npm run dev:all          # Docker (db only) + server (ts-node-dev) + web (vite)
npm run dev:server       # Server only (Express, ts-node-dev, port 3000)
npm run dev:web          # Web only (Vite, port 5173, proxies /api → localhost:3000)
npm run dev              # Docker Compose up (db only)
npm run format           # Prettier — write
npm run format:check     # Prettier — check only
npm run cli              # Run @openfactu/cli via ts-node
```

## Workspace layout

npm workspaces: `apps/*`, `plugins/*`.

- **`apps/server`** — Express + Drizzle ORM + PostgreSQL (CommonJS, `tsconfig.json` no strict)
- **`apps/web`** — React 19 + Vite 8 + Tailwind CSS (ESM, project references tsconfig)
- **No local `packages/`** — `@openfactu/ui`, `@openfactu/common`, `@openfactu/pdf` etc. are published to npm

## Build

- **Server:** `npm run build` (in `apps/server`) runs `tsc --noEmit && tsc` — type-check then emit CommonJS to `dist/`
- **Web:** `npm run build` (in `apps/web`) runs `tsc -b` (project references) then `vite build`

## Database

PostgreSQL 15 via Docker Compose. Multi-tenant: public schema (tenants, global users, audit log) + per-tenant schemas with isolated tables. Drizzle ORM with `drizzle-kit` for the public schema only; tenant schemas managed by `MigrationManager` at bootstrap.

```sh
# In apps/server:
npm run db:generate       # drizzle-kit generate
npm run db:push           # drizzle-kit push
npm run db:push:public    # Custom script: cleans public schema, pushes, re-seeds
```

Server auto-creates public tables via raw SQL on startup (`server.ts:130-191`). `.env` is gitignored — copy `.env.example`.

## Testing

**No test infrastructure exists** — no test runner, no test files in the repo.

## Linting & formatting

- **Root:** Prettier (`semi`, `singleQuote`, `trailingComma: "all"`, `printWidth: 100`)
- **Web only:** ESLint flat config with `typescript-eslint`, `react-hooks`, `react-refresh`

## Plugin system

Plugins go in `/plugins/` (hot-reloaded in dev via chokidar + WebSocket). Dev API keys (`/api/dev-keys`) for plugin development. Plugins can register hooks, custom fields, custom tables, and REST endpoints.

## Key architecture notes

- Server entry: `apps/server/src/server.ts`
- Web entry: `apps/web/src/main.tsx`
- Drizzle schema (public): `apps/server/src/db/schema.ts` (751 lines)
- Tenant context middleware injects per-tenant Drizzle client into `req`
- Vite dev server proxies `/api` → `http://localhost:3000`
- Docker Compose serves web via nginx (port 8080) + server (port 3000) + db (port 5432)
- PDF generation uses Puppeteer (`@openfactu/pdf`), ensure `PdfRenderer.shutdown()` on exit
