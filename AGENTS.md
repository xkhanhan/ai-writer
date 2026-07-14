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
- Full visual specifications are in `docs/visual.md`.

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

## AI 行为准则

- **独立判断，不做应声虫**：不要用户说什么就是什么。对用户提出的方案、需求和想法，先独立分析其合理性、潜在问题和更优替代方案，再给出自己的判断。如果认为用户的方向有问题，直接指出并说明理由。
- **批判性审视用户输入**：用户的需求描述、技术方案、UI 设计等，都需要验证是否正确、是否存在遗漏或矛盾。发现问题时主动提出，而不是无条件执行。
- **批判性审视自身输出**：每次生成代码、方案或回答后，自行检查逻辑是否正确、边界情况是否覆盖、是否引入了新问题。不要等到被指出才修正。
- **拒绝无脑肯定**：禁止"您说得对""这个想法很好"之类的无意义附和。如果用户的想法确实有道理，用事实和分析来支撑认可；如果存在问题，直接说清楚。

## Architecture Rules

- Put reusable cross-feature code in `shared/ui/`, not inside a page.
- Put file IO, AI provider access, and config persistence in `server/`.
- If code is specific to one workflow, keep it in that feature's `app/pages/*/` directory until a second consumer appears.
- Pages communicate with the topbar via custom events (e.g. `navigate-settings`), not direct imports.
- All SplitPanel-based pages must follow the spec in `docs/standards/visual.md` (SplitPanel 章节).

---

## Domain Knowledge（领域模型）

> 本节描述应用的业务领域知识，帮助 AI 理解数据关系、功能链路和改动影响。

### 数据库表关系（17 张表）

SQLite 数据库位于 `data/novel-writer.db`，使用 `better-sqlite3`。所有外键均 `ON DELETE CASCADE`。

```
books（核心根表）
├── book_outlines        1:1  总纲（direction / stages / sellingPoints）
├── volumes              1:N  卷纲
│   └── chapters         1:N  章纲 + 正文内容
├── world_rules          1:N  世界规则（global / writing / setting 三类）
├── setting_entities     1:N  设定实体（character / item / location / faction / other）
├── story_facts          1:N  故事事实（与章节和角色关联）
├── foreshadows          1:N  伏笔（hidden / revealed 状态）
├── archived_chapters    1:N  正文存档
├── folders              1:N  文件夹
│   └── files            1:N  文件
├── tag_categories       1:N  标签分类（支持层级）
├── prompt_templates     N:1  提示词模板（NULL = 系统级）
├── ai_generation_sessions 1:N  AI 生成记录
├── agent_conversations  1:N  Agent 对话
│   └── agent_messages   1:N  对话消息
└── book_options         KV   全局设置（键值对）
```

### 核心实体说明

#### Book（书籍）
根实体。字段：title, description, genre（题材大类）, platform（发布平台）, subGenre, tags, writingStyle, narrativePov, targetAudience, targetWordCount, endingType, referenceWorks, sellingPoint。

#### BookOutline（总纲）
每书一条。三个核心字段：
- `direction`：整体方向（故事走向、核心矛盾）
- `stages`：阶段划分（起承转合的节奏设计）
- `sellingPoints`：核心卖点（吸引读者的钩子）

#### VolumeOutline（卷纲）
一卷一条。字段：title, coreConflict（核心冲突）, developmentArc（发展弧线）, highlights（看点）, stages（阶段数组）, keyPoints（关键节点 JSON 数组）, sortOrder。

#### ChapterOutline（章纲 + 正文）
一章一条。章纲字段：title, summary, scenes, characters, keyEvents, foreshadowings, highlights, expectedWords, prevChapterLink, nextChapterSuspense, time, moodTone。正文字段：content（长文本）, status（planned / writing / done）。

#### WorldRule（世界规则）
三类分类：
- `global`：全局设定（力量体系、世界背景等硬约束）
- `writing`：写作规范（文风、节奏等软约束）
- `setting`：设定规则（可配置项，支持 select/number/text 类型）

#### SettingEntity（设定实体）
五类分类：character / item / location / faction / other。三级重要度：core / important / general。角色特有字段：appearance, traits, background, abilities, weaknesses。

#### StoryFact（故事事实）
记录已发生的剧情事实，关联 chapterId 和 relatedCharacterIds，用于一致性检查。

#### Foreshadow（伏笔）
记录伏笔/悬念，状态为 hidden（埋下）或 revealed（揭示），关联 chapterId 和 volumeId。

### AI 功能链路（12 个 functionKey）

每个 AI 功能的上下文构建器位于 `server/ai/context-builder/builders/`。

#### 数据密集度矩阵

| Store 函数 | content_generate | outline_optimize | volume_generate | character_audit | fact_consistency | polish/deslop/expand |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| getBookById | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| getChapterById | ✓ | - | - | - | - | 条件 |
| getChaptersByVolumeId | 2次 | - | - | 循环所有卷 | - | - |
| getVolumesByBookId | - | - | ✓ | ✓ | - | - |
| getWorldRulesByBookId | 2次 | - | - | 2次 | 1次(全部) | 1次 |
| getSettingEntitiesByBookId | ✓(character) | - | - | ✓(全部) | ✓(character) | - |
| getStoryFactsByBookId | ✓ | - | - | ✓ | ✓ | - |

#### 各功能说明

**content_generate（正文生成）**— 最重的 builder
- 输入：bookId + chapterId
- 读取：书籍信息 + 当前章纲 + 前一章结尾 + 全局/写作规则 + 角色设定 + 故事事实
- 输出：小说正文

**outline_optimize（总纲优化）**
- 输入：bookId（当前总纲内容通过 extraVariables 传入）
- 读取：仅书籍基本信息 + prompt 模板
- 输出：JSON 格式的诊断 + 优化建议
- ⚠️ 当前**不读取**卷纲、角色、世界规则等关联数据，AI 无法判断修改是否与已有内容冲突

**volume_generate（卷纲生成）**
- 输入：bookId（总纲 + 当前卷信息通过 extraVariables 传入）
- 读取：书籍信息 + 已有卷纲列表
- 输出：核心冲突 / 发展弧线 / 看点

**character_audit（角色审查）**
- 输入：bookId + characterId
- 读取：角色设定 + 全局/写作规则 + 故事事实 + 所有卷所有章（遍历正文中角色出场段落）
- ⚠️ 最耗性能的 builder（循环调用 getChaptersByVolumeId）

**fact_consistency（事实一致性）**
- 输入：bookId
- 读取：所有故事事实 + 所有世界规则 + 角色设定
- 输出：一致性检查报告

**polish / deslop / expand / book_synopsis_expand（文本处理四合一）**
- 输入：bookId + chapterId（可选）+ selectedText
- 读取：书籍信息 + 写作规则 + 章纲上下文（条件性）
- 差异仅在各自加载的 prompt 模板不同

**book_info_suggest（书籍信息建议）**— 最轻的 builder
- 输入：bookId + userConcept
- 读取：仅书籍基本信息

**world_rule_suggest（世界规则建议）**
- 输入：bookId + userConcept
- 读取：书籍信息 + 已有全部世界规则

### 关键设计决策

1. **JSON 字符串存储**：大量字段（keyPoints, scenes, characters, keyEvents 等）以 JSON 字符串存储在 TEXT 列中，而非使用关联表。读取时需 `JSON.parse`，写入时需 `JSON.stringify`。

2. **模板分隔符**：`outline_optimize` 和 `volume_generate` 的 prompt 模板使用 `\n---\n` 分隔 system/user 两部分。

3. **extraVariables 覆盖机制**：所有 builder 的变量都可通过 `input.extraVariables` 覆盖，调用方可以注入任意变量。

4. **Agent 场景注册**：Agent 面板的场景和快捷操作定义在 `server/ai/agent/scene-registry.ts`，工具定义在 `server/ai/agent/tools.ts`。

5. **双模式 AI 调用**：系统同时支持两种 AI 调用模式：
   - **ContextBuilder 模式**：通过 `buildContext()` 构建完整上下文，适用于精确控制（正文生成、总纲优化等）
   - **Agent 模式**：通过 `streamText()` + tools，适用于对话式交互（Agent 面板）

### 改动影响分析

修改某类数据时，需要关注的下游影响：

| 修改的数据 | 可能受影响的功能 |
|---|---|
| **总纲（direction）** | 卷纲生成依赖总纲方向；已生成的卷纲可能与新方向矛盾 |
| **卷纲（coreConflict）** | 正文生成依赖卷纲冲突设计；前序卷纲的连贯性 |
| **章纲（summary/characters）** | 正文生成直接依赖章纲；事实一致性检查 |
| **角色设定（traits/abilities）** | 正文生成引用角色特征；角色审查对比设定与正文 |
| **世界规则（global）** | 正文生成必须遵守；事实一致性检查 |
| **故事事实（content）** | 事实一致性检查的输入数据 |
| **伏笔（status）** | 正文生成中伏笔的埋设/揭示状态 |
