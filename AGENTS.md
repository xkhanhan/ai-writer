# Repository Guidelines

> **开发环境**: Windows + PowerShell。所有脚本命令以 `.ps1` 为准，禁止使用 bash/Linux 语法。

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

Use these before merging feature branches into master.

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
- Full visual specifications are in `docs/standards/visual.md`.

## Testing Guidelines

There is no dedicated test framework yet. For now, the minimum verification set is:

- `npm run typecheck`
- `npm run lint`
- `npm run build`

When tests are added, place them near the feature they cover or in a feature-local `__tests__/` folder.

## Git 工作流（单人开发 + AI 协作）

**Remote**: `origin` → `https://github.com/xkhanhan/ai-writer.git`

> 核心目标：保证 AI 生成的代码可回滚，同时保持流程简洁。

### 分支策略

- `master` — 稳定分支，始终保持可运行状态
- `feature/*` — 功能开发分支，**AI 只能在此分支上提交**

### 分支命名规范

```
feature/简短功能描述     例: feature/creation-zone
fix/问题简述            例: fix/scroll-overflow
```

### 角色与权限

| 角色 | 可以做 | 禁止做 |
|------|--------|--------|
| AI | 在 `feature/*` 上 commit | 直接 commit/push `master` |
| 人（你） | 在 `master` 上直接编辑、merge feature 分支 | — |

### AI 提交流程

AI 每次完成一个独立任务后，在 feature 分支上提交：

```
typecheck → lint → git add → git commit
```

**禁止** AI 直接操作 `master` 分支（不 commit、不 push、不 merge）。

### 人（你）的合并流程

feature 分支开发完成、确认功能正常后，一条命令合并到 master（无需切换分支）：

```powershell
# 在 feature 分支上直接执行，自动推送到 master 并同步本地指针
.\scripts\merge-to-master.ps1
```

> 合并前建议跑一下 `npm run typecheck && npm run lint` 确认无误。

### 回滚方式

- **回滚单个 commit**：`git revert <commit-hash>`
- **回滚整个 feature**：合并前直接删除分支，master 不受影响
- **回滚已合并的 feature**：`git revert <merge-commit>`

### Commit 规范

```
feat(scope): summary
fix(scope): summary
docs(scope): summary
refactor(scope): summary
```

Examples: `feat(home): add ai test panel`, `fix(ai): validate empty prompt`.

## Architecture Rules

- Put reusable cross-feature code in `shared/ui/`, not inside a page.
- Put file IO, AI provider access, and config persistence in `server/`.
- If code is specific to one workflow, keep it in that feature's `app/pages/*/` directory until a second consumer appears.
- Pages communicate with the topbar via custom events (e.g. `navigate-settings`), not direct imports.
- All SplitPanel-based pages must follow the spec in `docs/standards/visual.md` (SplitPanel 章节).
