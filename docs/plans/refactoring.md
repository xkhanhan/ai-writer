# Refactoring Plan

> Generated 2026-07-07. Branch: `refactor/code-quality`

## Current State

- typecheck: PASS, lint: PASS, build: PASS
- Frontend: 31 issues (10 severe, 15 medium, 6 minor)
- Backend: 20 issues (6 severe, 6 medium, 8 minor)

---

## Phase 1: Architecture & Type Safety (HIGH — blocks everything)

### 1.1 Move shared types to `shared/` [Frontend+Backend]

`TagCategory` type is defined in `app/types/index.ts` but imported by `shared/ui/tag-tree` and `shared/ui/tag-selector` — violates dependency direction (shared → app forbidden).

**Action:**
- Create `shared/types/index.ts` with `TagCategory`, `CreateTagCategoryDTO`, `UpdateTagCategoryDTO`
- Update imports in `shared/ui/tag-tree`, `shared/ui/tag-selector`, `app/types/index.ts` (re-export from shared)
- Update server store imports (`tag-store.ts`) to use `shared/types`

### 1.2 Move `useTagTree` hook out of shared [Frontend]

`shared/ui/tag-selector/index.tsx` imports `useTagTree` from `app/hooks/use-tag-tree` — shared must not depend on app.

**Action:**
- Move `useTagTree` to `shared/hooks/use-tag-tree.ts`
- Or: make TagSelector accept tree data as prop instead of fetching internally

### 1.3 Fix API route importing from `app/pages/` [Backend]

`app/api/ai/models/route.ts` imports `getProviderById` from `app/pages/settings-ai/config/providers` — route depends on page module.

**Action:**
- Move `providers.ts` config to `shared/ai/providers.ts`
- Update both route and page imports

### 1.4 Eliminate duplicate type definitions [Backend]

`server/storage/book-store.ts` defines `Book` type separately from `app/types/index.ts`.

**Action:**
- Import from `app/types/` (or `shared/types/` after 1.1) in all store files
- Remove local type definitions in store files

---

## Phase 2: Backend Cleanup (HIGH — correctness & consistency)

### 2.1 Standardize API response format [Backend]

Currently 3 success formats and 3 error formats across routes.

**Target format:**
```
Success: { success: true, data: <payload> }
Error:   { success: false, error: "<code>", message: "<description>" }
```

**Action:**
- Create `app/api/utils.ts` with `jsonSuccess(data)` and `jsonError(code, message, status)` helpers
- Refactor all routes to use standardized helpers
- Affected: all `app/api/*/route.ts` files (~20 files)

### 2.2 Add missing input validation [Backend]

Multiple routes pass empty string `""` as default when query params are missing.

**Action:**
- Add 400 checks for required query params in: `volumes/route.ts`, `chapters/route.ts`, `outline/route.ts`, `archive/route.ts`
- Validate body fields in `books/[id]/route.ts` PATCH handler

### 2.3 Check DELETE return values [Backend]

`volumes/[id]`, `chapters/[id]`, `archive/[id]` don't check delete success.

**Action:**
- Add `if (!success) return jsonError("NOT_FOUND", "Resource not found", 404)` to all DELETE handlers

### 2.4 Add try/catch to unprotected routes [Backend]

`app/api/ai/config/route.ts` GET has no try/catch.

**Action:**
- Wrap all route handlers in try/catch (use standardized `jsonError`)

### 2.5 Fix `uniqueCode` infinite loop risk [Backend]

`server/storage/tag-store.ts` `uniqueCode` has `while(true)` with no upper bound.

**Action:**
- Add `maxAttempts = 100` counter, throw after limit

### 2.6 Add transactions for multi-step writes [Backend]

`tag-store.ts` `deleteTagCategory` and `folder-file-store.ts` `createFile` do multiple writes without transaction.

**Action:**
- Wrap in `db.transaction(() => { ... })` for atomicity

### 2.7 Unify HTTP methods (PUT → PATCH) [Backend]

6 routes use PUT for partial updates, 2 use PATCH. Standardize to PATCH.

**Action:**
- Change PUT to PATCH in: `volumes/[id]`, `chapters/[id]`, `world-rules/[id]`, `setting-entities/[id]`, `tags/[id]`, `outline`
- Update frontend API calls to match

### 2.8 Unify timestamp generation [Backend]

`book-store.ts` and `folder-file-store.ts` use JS `new Date().toISOString()`, others use SQL `datetime('now')`.

**Action:**
- Standardize to SQL `datetime('now')` everywhere (consistent format)

---

## Phase 3: Code Deduplication (MEDIUM — maintainability)

### 3.1 Extract shared utility functions [Frontend]

Duplicated across files:
- `useDebounce` — in tag-library, tag-selector, home
- `collectAllIds` / `searchMatch` — in tag-library, tag-selector
- `findInTree` / `findTagById` — in tag-library, tag-tree

**Action:**
- Create `shared/utils/tree-utils.ts` with `collectAllIds`, `searchMatch`, `findInTree`
- Create `shared/hooks/use-debounce.ts` with `useDebounce`

### 3.2 Extract `jsonError` to shared utility [Backend]

Duplicated in 3 route files.

**Action:**
- Create `app/api/utils.ts` (already part of 2.1)

### 3.3 Extract `parseJsonSafe` to shared utility [Backend]

Duplicated in 3 store files.

**Action:**
- Create `server/utils/json.ts` with `parseJsonSafe<T>(json: string | null, fallback: T): T`

### 3.4 Extract `buildUpdateQuery` helper [Backend]

6 store files have identical if-push-update pattern.

**Action:**
- Create `server/utils/query-builder.ts` with `buildUpdateQuery(fields, allowedFields)`
- Refactor all store update functions to use it

### 3.5 Deduplicate `deleteBook` API function [Frontend]

Defined in both `app/pages/home/api/books.ts` and `app/pages/books/api/books.ts`.

**Action:**
- Keep in `app/pages/home/api/books.ts` only, import in books page

---

## Phase 4: Frontend Quality (MEDIUM — performance & UX)

### 4.1 Replace hardcoded colors with CSS variables [Frontend]

`foreshadow-library/index.module.css` has 14 hardcoded hex colors.

**Action:**
- Replace all `#ffffff` → `var(--bg-elevated)` or `var(--text-inverse)`
- Replace all `#6b7280` → `var(--text-secondary)`
- Replace colored status backgrounds with appropriate CSS variable combinations
- Fix `rgba(47, 93, 80, ...)` in book-info-form → use `var(--color-primary)` based values

### 4.2 Remove `!important` overrides [Frontend]

9 `!important` usages across 4 files.

**Action:**
- Increase specificity via CSS Modules class nesting instead of `!important`

### 4.3 Fix setState during render [Frontend]

`content-editor/index.tsx` calls setState directly in render body.

**Action:**
- Convert to `useEffect` with proper dependency array

### 4.4 Lazy-render workspace panels [Frontend]

`app/pages/books/index.tsx` renders all panels simultaneously (display:none for hidden).

**Action:**
- Switch to conditional rendering: only mount active panel component

### 4.5 Replace `Record<string, unknown>` with DTOs [Frontend]

`app/pages/books/api/creation.ts` uses loose types for volume/chapter operations.

**Action:**
- Define `CreateVolumeDTO`, `UpdateVolumeDTO`, `CreateChapterDTO`, `UpdateChapterDTO` in `app/types/`
- Use in API functions

### 4.6 Standardize message usage [Frontend]

`navigation-tree` and `content-editor` use `message.success/error` instead of `showSuccess/showError`.

**Action:**
- Replace all `message.success/error/warning` with `showSuccess/showError/showWarning`

---

## Phase 5: Dead Code Cleanup (LOW — hygiene)

### 5.1 Remove dead files

- `server/storage/file-store.ts` — unused JSON file storage
- `server/utils/id-generator.ts` — unused (all stores use `randomUUID`)
- `closeDb()` function in `server/storage/db.ts` — never called

### 5.2 Remove dead code patterns

- `book-options-store.ts` `getBookOptions` read-with-write side effect — separate read and write
- `ai-config-store.ts` sync IO → convert to async `fs.promises`

---

## Execution Order

```
Phase 1 (architecture)  → must complete first
  ↓
Phase 2 (backend) + Phase 3 (dedup) — can be parallelized
  ↓
Phase 4 (frontend) — after Phase 1 types are stable
  ↓
Phase 5 (cleanup) — last
```

Each phase should be a separate commit (or PR if large). Verify `typecheck + lint + build` after each phase.

## Verification Checklist

After all phases:
- [ ] `npm run typecheck` — zero errors
- [ ] `npm run lint` — zero warnings
- [ ] `npm run build` — production build passes
- [ ] No `shared/` imports from `app/`
- [ ] No hardcoded colors in CSS files
- [ ] All API routes have consistent `{ success, data/error }` format
- [ ] All DELETE handlers check return value
- [ ] No `Record<string, unknown>` in API functions
- [ ] No `message.error/success` — all use showError/showSuccess
