# Coding Standards

## TypeScript

- `strict: true` — zero tolerance for type errors
- Indentation: 2 spaces, UTF-8, LF line endings
- **No `any`**. Exception: DB queries use `as unknown as RowType`
- `interface` for object shapes; `type` for union/intersection/conditional types
- Naming: classes/interfaces PascalCase, functions/variables camelCase, constants UPPER_SNAKE_CASE

## React / Next.js

- Components needing browser API, state, or side effects: `"use client"`
- File naming: components `kebab-case.tsx`, non-components `kebab-case.ts`
- Exported component names: PascalCase
- Props interface: `ComponentNameProps` suffix
- Custom hooks: `app/pages/{page}/hooks/use-xxx.ts` (or `app/hooks/` for cross-page)
- Prefer CSS Modules, no inline styles (except minor layout tweaks)

## CSS Modules

- Filename: `index.module.css`, co-located with component
- Class names: camelCase (`.cardTitle` not `.card-title`)
- **No hardcoded colors** — use CSS variables only (see [visual.md](./visual.md))
- Responsive breakpoint: `@media (max-width: 768px)` only

## API Route Encoding

Route files are thin adapters — parse request, call `server/` functions, return JSON.

```typescript
// ✅
export async function GET() {
  try {
    const books = await listBooks();
    return NextResponse.json({ success: true, books });
  } catch {
    return jsonError("Failed to load books.", 500);
  }
}

// ❌ Business logic in route
export async function GET() {
  const db = getDb();
  const books = db.prepare("SELECT * FROM books").all();
  return Response.json(books);
}
```

## Store Encoding

- One `*-store.ts` per table, exporting standalone functions (no classes)
- Use `getDb()` for DB connection (never create own connection)
- Parameterized SQL only:
  ```typescript
  // ✅
  db.prepare("SELECT * FROM books WHERE id = ?").get(id) as unknown as BookRow;
  // ❌ String concatenation
  db.prepare(`SELECT * FROM books WHERE id = '${id}'`).get();
  ```

## Verification (mandatory before every commit)

| Command | Purpose |
|---------|---------|
| `npm run typecheck` | TypeScript type check |
| `npm run lint` | ESLint code quality |
| `npm run build` | Production build validation |

All three must pass. No exceptions.

## Package Manager

- **npm only** — no yarn / pnpm mixing
- `package-lock.json` must be committed
- Evaluate new deps: necessity → bundle size → maintenance → security
