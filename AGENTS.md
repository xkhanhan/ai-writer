# Repository Guidelines

## Project Structure & Module Organization

This is a Next.js application using a four-layer architecture:

- `app/`: Next.js entrypoints, layouts, pages, API routes, and shared app-level code.
  - `app/pages/`: page-level components organized by route (`home/`, `books/`, `settings-ai/`).
  - `app/pages/*/components/`: feature-specific UI components (e.g. `world-rules/`, `settings-library/`).
  - `app/pages/*/hooks/`: feature-specific React hooks.
  - `app/pages/*/api/`: client-side API helper functions.
  - `app/api/`: Next.js API route handlers (thin: parse request → call `server/*` → return JSON).
  - `app/components/`: app-shell layout components (`app-shell/`, `layout-shell.tsx`, `shell-provider.tsx`).
  - `app/types/`: shared TypeScript type definitions.
  - `app/utils/`: shared client-safe utilities.
- `shared/`: reusable client-safe contracts and UI components.
  - `shared/ui/`: design-system components — `split-panel`, `empty-state`, `confirm-delete`, `save-button`, `ai-dropdown`, `array-input`, `theme`.
  - `shared/ai/`: AI provider contracts and config types.
- `server/`: server-only logic (never imported by client components).
  - `server/ai/`: AI provider access and config persistence.
  - `server/storage/`: file IO, database, and data persistence.
- `data/`: runtime data files (JSON, SQLite database).

Project documentation lives in `docs/` — see `docs/README.md` for the full directory structure.

## Build, Test, and Development Commands

- `npm run dev`: start the local Next.js dev server.
- `npm run build`: create a production build and catch integration issues.
- `npm run typecheck`: run TypeScript without emitting files.
- `npm run lint`: run ESLint across the repo.

Use these before opening a PR or handing work off.

## Coding Style & Naming Conventions

- TypeScript only; keep `strict` mode passing.
- Use 2-space indentation and UTF-8 text files.
- React component files use `kebab-case.tsx`; exported component names use `PascalCase`.
- Non-component files use `kebab-case.ts`.
- CSS Modules for styling: `index.module.css` co-located with each component.
- Keep API route files thin: parse request, call `server/*`, return JSON.
- Do not import `server/*` into client components.

## Design System & Visual Standards

- **UI Framework**: Ant Design v6 — the only permitted component library.
- **Design Tokens**: all colors, typography, spacing, and borders defined as CSS variables in `app/globals.css`.
- **Theme System**: 4 preset themes (暖纸色 / 冷灰调 / 纯白 / 深色) via React Context + CSS variable injection.
- **SplitPanel**: reusable left-right split component at `shared/ui/split-panel/`. All list+detail pages must use it.
- **Component Rules**: use `size="small"` for inline buttons; new-entity buttons use `type="primary"`; delete buttons use `danger`.
- Full visual specifications are in `docs/standards/visual/`.

## Testing Guidelines

There is no dedicated test framework yet. For now, the minimum verification set is:

- `npm run typecheck`
- `npm run lint`
- `npm run build`

When tests are added, place them near the feature they cover or in a feature-local `__tests__/` folder.

## Commit & Pull Request Guidelines

**每个独立任务完成后，必须自动执行 git commit。** 完成顺序：`typecheck` → `lint` → `git add` → `git commit`。不要等待用户显式要求提交。

Follow the existing documented convention:

- `feat(scope): summary`
- `fix(scope): summary`
- `docs(scope): summary`
- `chore(scope): summary`

Examples: `feat(home): add ai test panel`, `fix(ai): validate empty prompt`.

PRs should include:

- a short description of the user-facing or architectural change
- any affected paths, such as `app/pages/books/` or `shared/ui/`
- screenshots for UI changes
- the exact verification commands you ran

## Architecture Rules

- Put reusable cross-feature code in `shared/ui/`, not inside a page.
- Put file IO, AI provider access, and config persistence in `server/`.
- If code is specific to one workflow, keep it in that feature's `app/pages/*/` directory until a second consumer appears.
- Pages communicate with the topbar via custom events (e.g. `navigate-settings`), not direct imports.
- All SplitPanel-based pages must follow the spec in `docs/standards/visual/components/SPLITPANEL_SPEC.md`.
