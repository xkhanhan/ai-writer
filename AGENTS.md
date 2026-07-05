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

## Git 工作流（严格模式）

**Remote**: `origin` → `https://github.com/xkhanhan/ai-writer.git`

### 分支策略

- `master` — 生产分支，仅通过 PR 合并，**禁止直接 push**
- `feature/*` — 功能开发分支，从 master 切出，完成后通过 PR 合回 master
- `fix/*` — 紧急修复分支，从 master 切出
- `docs/*` — 纯文档变更分支

### 分支命名规范

```
feature/简短功能描述     例: feature/creation-zone
fix/问题简述            例: fix/scroll-overflow
docs/文档变更简述        例: docs/update-agents
```

### 禁止事项

- **禁止**直接向 `master` push 代码
- **禁止**在 master 上直接修改文件
- **禁止**跳过 PR 流程合并代码
- **禁止**合并未通过 typecheck + lint 的代码

### 提交流程

1. 从 `master` 切出功能分支：`git checkout -b feature/xxx master`
2. 开发过程中，每个独立任务完成后自动提交：
   `typecheck` → `lint` → `git add` → `git commit`
3. 开发完成后推送分支：`git push -u origin feature/xxx`
4. 创建 PR，填写规范的标题和描述
5. 等待 review 通过后合并

### Commit 规范

- `feat(scope): summary`
- `fix(scope): summary`
- `docs(scope): summary`
- `chore(scope): summary`

Examples: `feat(home): add ai test panel`, `fix(ai): validate empty prompt`.

### PR 要求

PR 标题必须包含模块名和变更摘要，例如：

```
feat(books): 新增创作区四层大纲结构
fix(world-rules): 修复规则编辑弹窗表单重置问题
docs(standards): 更新 SplitPanel 组件规范
```

PR 描述必须包含：

- 变更内容的简要说明
- 影响的文件路径
- UI 变更的截图
- 验证命令及结果（typecheck / lint / build）

## Architecture Rules

- Put reusable cross-feature code in `shared/ui/`, not inside a page.
- Put file IO, AI provider access, and config persistence in `server/`.
- If code is specific to one workflow, keep it in that feature's `app/pages/*/` directory until a second consumer appears.
- Pages communicate with the topbar via custom events (e.g. `navigate-settings`), not direct imports.
- All SplitPanel-based pages must follow the spec in `docs/standards/visual/components/SPLITPANEL_SPEC.md`.
