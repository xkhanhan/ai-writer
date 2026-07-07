# Architecture

## Four-Layer Structure

```
app/       → Next.js pages, API routes, hooks, api-client
server/    → DB access, AI providers, server utilities (server-only)
shared/    → Cross-feature UI components, AI contracts
data/      → Runtime data (SQLite DB, JSON configs)
```

## Dependency Rules (strict, bidirectional forbidden)

```
Allowed:
  app/    → server/    (via API routes only)
  app/    → shared/    (import components and types)
  server/ → shared/    (import shared types)
  server/ → data/      (read/write DB and files)

Forbidden:
  server/ → app/
  shared/ → app/
  shared/ → server/
  app/ directly importing server/storage/*
```

Client components **must never** import from `server/`. Communication only via `app/api/` routes.

## Component Placement

| Code | Location |
|------|----------|
| Cross-page UI components | `shared/ui/` |
| Page-specific components | `app/pages/{page}/components/` |
| Page-specific hooks | `app/pages/{page}/hooks/` |
| Page-specific API helpers | `app/pages/{page}/api/` or `app/api-client/` |
| App shell components | `app/components/` |
| API route adapters | `app/api/*/route.ts` |
| Shared types | `app/types/` or `shared/ai/` |
| Client utilities | `app/utils/` |

## Page Communication

Pages communicate with the topbar via custom events (e.g. `navigate-settings`), not direct imports.

## API Route Rules

Route files (`app/api/*/route.ts`) are thin adapters:
1. Parse request params
2. Call `server/` functions
3. Return JSON

**Forbidden:** Business logic in route files.

## Server-Only Constraints

- `server/` code **must never** appear in client bundles
- DB access via `getDb()` singleton (`server/storage/db.ts`)
- One `*-store.ts` per table, exporting standalone functions (no classes)
- No Service/Repository/Model layers, no dependency injection

## Database

- Engine: SQLite via `better-sqlite3`
- File: `data/novel-writer.db`
- All SQL: parameterized queries only (no string concatenation)
- Type assertion: `as unknown as RowType` (never `as any`)
- Type definitions: `app/types/` (shared between frontend and backend)
- Migrations: `server/storage/migrations/`
- `data/` runtime files **not committed** to Git
