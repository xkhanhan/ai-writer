# 优化计划

> 生成日期：2026-07-07 | 分支：`refactor/code-quality`
> 原则：**让代码更健壮、更好维护；不为优化而引入不必要的复杂度。**

## 总览

基于代码库扫描，共识别 **38 项** 优化点，分为 **5 个阶段**。每个阶段都是独立可交付的——完成后代码库保持可运行、可验证。

| 阶段 | 主题 | 项数 | 优先级 | 核心价值 |
|------|------|------|--------|---------|
| 1 | 数据完整性基础 | 6 | P0 | 数据不会丢、查询不会慢 |
| 2 | 架构合规与类型统一 | 8 | P0 | 依赖方向正确，类型不再重复 |
| 3 | 后端健壮性 | 8 | P1 | 输入校验、错误处理、事务保护 |
| 4 | 前端可靠性 | 8 | P1 | 内存泄漏、XSS、死代码 |
| 5 | CSS 一致性 | 8 | P2 | 硬编码颜色消除、变量统一 |

---

## 阶段一：数据完整性基础（P0） ✅ 已完成

> 数据库是根基。外键未启用 = 级联删除形同虚设，无索引 = 数据量增长后查询变慢。

### 1.1 启用 SQLite 外键约束

**问题**：`server/storage/db.ts` 缺少 `PRAGMA foreign_keys = ON`，所有 `ON DELETE CASCADE` 声明无效，删除书籍会产生大量孤儿记录。

**改动**：
- `server/storage/db.ts`：`getDb()` 单例初始化时添加 `db.pragma("foreign_keys = ON")`
- 验证：删除一本书后检查 volumes、chapters、world_rules 等表是否正确级联

### 1.2 补充数据库索引

**问题**：所有表无索引，高频查询走全表扫描。

**改动**：在 `initDatabase()` 中添加：

| 表 | 索引列 | 用途 |
|----|--------|------|
| `volumes` | `book_id` | 按书籍查卷纲 |
| `chapters` | `volume_id` | 按卷纲查章纲 |
| `chapters` | `volume_id, sortOrder` | 排序查询 |
| `tag_categories` | `book_id` | 按书籍查标签树 |
| `tag_categories` | `book_id, parent_id` | 子节点查询 |
| `setting_entities` | `book_id` | 按书籍查设定 |
| `setting_entities` | `book_id, category` | 按分类查设定 |
| `world_rules` | `book_id` | 按书籍查规则 |
| `files` | `folder_id` | 按文件夹查文件 |
| `folders` | `book_id, category` | 按分类查文件夹 |
| `archived_chapters` | `book_id` | 按书籍查存稿 |
| `book_outlines` | `book_id` | 按书籍查总纲 |

### 1.3 统一时间戳生成方式

**问题**：`book-store.ts` 和 `folder-file-store.ts` 用 JS `new Date().toISOString()`，其他用 SQL `datetime('now')`，精度不一致。

**改动**：全部统一为 SQL `datetime('now')`。

### 1.4 为多步写操作添加事务

**问题**：`tag-store.ts` 的 `deleteTagCategory` 和 `folder-file-store.ts` 的 `createFile` 无事务保护，中间失败会导致数据不一致。

**改动**：用 `db.transaction(() => { ... })` 包裹。

### 1.5 修复 uniqueCode 死循环风险

**问题**：`tag-store.ts` 的 `uniqueCode` 使用 `while(true)` 无上限，理论上可能无限循环。

**改动**：添加 `maxAttempts = 100` 计数器，超限抛出错误。

### 1.6 补充外键完整性检查

**操作**：检查 `db.ts` 中所有表定义，确保：
- 新表都有 `FOREIGN KEY ... ON DELETE CASCADE`
- 外键列和高频查询列已建索引（见 1.2）

---

## 阶段二：架构合规与类型统一（P0） ✅ 已完成

> 依赖方向错误会像滚雪球一样累积技术债，越早修复代价越低。

### 2.1 共享类型下沉到 `shared/`

**问题**：`TagCategory` 类型定义在 `app/types/index.ts`，但 `shared/ui/tag-tree` 和 `shared/ui/tag-selector` 导入了它 — 违反 `shared/ → app/` 禁止的依赖方向。

**改动**：
- 创建 `shared/types/index.ts`，包含 `TagCategory`、`CreateTagCategoryDTO`、`UpdateTagCategoryDTO`
- 更新所有引用方的导入路径
- `server/storage/tag-store.ts` 也改为从 `shared/types/` 导入

### 2.2 将 `useTagTree` 移到 `shared/`

**问题**：`shared/ui/tag-selector/index.tsx` 从 `app/hooks/use-tag-tree` 导入 — shared 禁止依赖 app。

**改动**：将 `useTagTree` 移至 `shared/hooks/use-tag-tree.ts`。

### 2.3 修复 API 路由的反向导入

**问题**：`app/api/ai/models/route.ts` 从 `app/pages/settings-ai/config/providers` 导入。

**改动**：将 `providers.ts` 迁移至 `shared/ai/providers.ts`。

### 2.4 消除 server 端重复类型定义

**问题**：`server/storage/book-store.ts` 重新定义了 `Book`、`BookOptions`，`server/storage/book-options-store.ts` 重复定义了 `GenreTreeNode`。

**改动**：所有 store 统一从 `app/types/` 或 `shared/types/` 导入，删除本地重复定义。

### 2.5 合并重复的 JSON 安全清理

**问题**：`app/pages/settings-ai/utils/json-security.ts` 和 `shared/ai/config-contracts.ts` 有重叠的原型污染防护功能。

**改动**：保留 `shared/ai/config-contracts.ts` 中的实现，删除 `settings-ai/utils/json-security.ts` 中的重复逻辑，改为调用 shared 版本。

### 2.6 清理未使用的文件和代码

| 文件/代码 | 问题 |
|-----------|------|
| `server/utils/id-generator.ts` | 定义了 `generateId()` 但无人使用，所有 store 直接用 `randomUUID` |
| `server/storage/file-store.ts` | 废弃的 JSON 文件存储，已被 SQLite 替代 |
| `server/storage/db.ts` 中的 `closeDb()` | 从未被调用 |
| `shared/ui/save-button/index.module.css` | 完全未使用的样式文件 |
| `app/pages/books/api/creation.ts` 中 `key-points` 相关 4 个函数 | 引用不存在的 `/api/key-points` 路由 |
| `app/pages/books/api/creation.ts` 中 `saveOutline` | 使用 `client.post` 但 `/api/outline` 只有 GET 和 PUT |

**改动**：删除未使用文件，移除死代码，修正 `saveOutline` 为 `client.put`。

### 2.7 统一 API 客户端入口

**问题**：存在两套 API 客户端体系 — `app/api-client/`（新，基于 ApiClient 类）和 `app/pages/*/api/`（旧，独立函数）。

**改动**：不重构旧代码（风险高、收益低），但在 `app/api-client/index.ts` 中导出所有 API 函数，让新代码统一从 `app/api-client/` 导入。旧代码保持不动，后续新功能开发时自然迁移。

### 2.8 消除 layout + page 双重数据获取

**问题**：`app/layout.tsx` 和 `app/page.tsx` 各调用一次 `listBooks()`。

**改动**：确认哪处是必要的，移除重复调用。

---

## 阶段三：后端健壮性（P1） ✅ 已完成

> 后端是数据的最后一道防线，输入校验和错误处理不能缺。

### 3.1 补充 API 输入校验

**问题**：多个路由直接将 `body` 透传给 store 无任何校验。

**改动**：为以下路由添加必填参数校验（返回 400）：
- `volumes/route.ts`、`chapters/route.ts`、`outline/route.ts`、`archive/route.ts`
- `books/[id]/route.ts` PATCH：校验 body 字段类型

### 3.2 修复 DELETE 返回值未检查

**问题**：`volumes/[id]`、`chapters/[id]`、`archive/[id]` 未检查删除结果。

**改动**：添加 `if (!success) return 404` 响应。

### 3.3 修复 `ai/config/route.ts` 缺少 try/catch

**问题**：GET handler 无错误保护。

**改动**：包裹 try/catch。

### 3.4 AI 调用添加超时保护

**问题**：`app/api/ai/test/route.ts` 和 `server/ai/generate-ai-text.ts` 的 fetch 无超时设置。

**改动**：使用 `AbortController` + `setTimeout` 设置 30s 超时。

### 3.5 异步化文件操作

**问题**：`server/ai/ai-config-store.ts` 使用 `fs.readFileSync`/`writeFileSync` 阻塞事件循环。

**改动**：改为 `fs.promises.readFile`/`writeFile`。

### 3.6 统一 HTTP 方法（PUT → PATCH）

**问题**：6 个路由用 PUT 执行部分更新，2 个用 PATCH，语义不一致。

**改动**：
- PUT → PATCH：`volumes/[id]`、`chapters/[id]`、`world-rules/[id]`、`setting-entities/[id]`、`tags/[id]`、`outline`
- 同步更新前端 API 调用

### 3.7 统一 API 响应格式

**问题**：存在 3 种成功格式 + 3 种错误格式。

**改动**：
- 创建 `app/api/utils.ts`，提供 `jsonSuccess(data)` 和 `jsonError(code, message, status)`
- 逐步重构路由使用（不急于一次性改完，每改一个路由验证一个）

### 3.8 提取 `parseJsonSafe` 到共享工具

**问题**：`outline-store.ts`、`world-rule-store.ts`、`tag-store.ts`、`setting-entity-store.ts` 各自实现 JSON.parse + try/catch。

**改动**：创建 `server/utils/json.ts`，统一使用。

---

## 阶段四：前端可靠性（P1） ✅ 已完成

> 内存泄漏、XSS、渲染错误 — 这些是用户能直接感知到的问题。

### 4.1 修复 `useFolderFileEditor` setTimeout 内存泄漏

**问题**：setTimeout 无 cleanup，组件卸载后 timer 仍执行，导致已卸载组件的 setState。

**改动**：
- 添加 `useEffect` cleanup：`return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); }`
- 修复 debounce 期间切换文件导致保存到旧文件的 stale closure bug

### 4.2 修复 `ContentEditor` 渲染期间 setState

**问题**：渲染函数体内直接调用 setState。

**改动**：改为 `useEffect`，依赖 `[chapterId]`。

### 4.3 修复 XSS 风险

**问题**：`book-info-form/index.tsx` 使用 `dangerouslySetInnerHTML` 渲染包含用户标题的 HTML。

**改动**：改用 React 元素渲染（`<b>{a.title}</b>`）。

### 4.4 为 `useBook` 添加竞态保护

**问题**：`update` 方法先 PATCH 再 GET，并发调用时可能导致 UI 显示旧数据。

**改动**：添加递增的请求 ID，GET 返回时检查是否为最新请求。

### 4.5 添加 React Error Boundary

**问题**：项目无 Error Boundary，组件运行时错误导致白屏。

**改动**：
- 在 `app/layout.tsx` 添加全局 Error Boundary
- 为关键页面添加 `app/**/error.tsx`

### 4.6 消除 `message.error/success` 直接调用

**问题**：`navigation-tree` 和 `content-editor` 使用 `message.success/error`，绕过了统一的错误处理链。

**改动**：全部替换为 `showSuccess/showError`。

### 4.7 用明确 DTO 替代 `Record<string, unknown>`

**问题**：`app/pages/books/api/creation.ts` 的 volume/chapter 操作使用宽松类型。

**改动**：在 `app/types/` 中定义 `CreateVolumeDTO`、`UpdateVolumeDTO`、`CreateChapterDTO`、`UpdateChapterDTO`。

### 4.8 清理 globals.css 冗余变量

**问题**：`--collapse-*`、`--tag-*`、`--filter-*` 共 11 个变量在所有 CSS 模块中均未使用。

**改动**：删除未使用的变量定义。

---

## 阶段五：CSS 一致性（P2） ✅ 已完成

> 视觉不一致会让用户觉得产品不专业，但修复应聚焦在真正影响体验的问题上。

### 5.1 补全未定义的 CSS 变量引用

**问题**：5 个 CSS 文件引用了 `globals.css` 中不存在的变量。

| 变量 | 影响 |
|------|------|
| `--text-muted` | empty-state、array-input、content-library 文字颜色失效 |
| `--color-danger` | array-input 删除图标颜色失效 |
| `--surface-container-highest` | home 书籍卡片边框色失效 |
| `--surface-variant` | home 书籍封面背景色失效 |

**改动**：在 `globals.css` 中定义这些变量。

### 5.2 替换硬编码颜色

**问题**：约 28 处硬编码颜色（hex/rgba），不随主题变化。

**改动**：逐文件替换为对应 CSS 变量。重点关注：
- `foreshadow-library/index.module.css`（14 处，状态标签颜色）
- `book-info-form/index.module.css`（5 处，rgba 硬编码）
- `home/index.module.css`（3 处）

### 5.3 移除 `!important` 覆盖

**问题**：9 处 `!important`，其中 book-info-form 4 处覆盖 antd Button。

**改动**：通过 CSS Modules 类嵌套或 antd ConfigProvider tokens 替代。

### 5.4 统一 CSS 命名体系

**问题**：`globals.css` 中新旧两套命名（`--color-primary` vs `--accent`），组件混用。

**改动**：统一为新体系（`--color-*`、`--bg-*`、`--text-*`），旧别名标记为 deprecated 并逐步替换引用。

### 5.5 补全 ThemeProvider 变量注入

**问题**：ThemeProvider 只注入 17 个变量，遗漏了 `--color-primary-bg` 等需要随主题变化的变量。

**改动**：扩展 `ThemeColors` 接口，补全所有需要注入的变量。

### 5.6 补充无障碍属性

**问题**：全项目仅 2 处 `aria-label`。

**改动**：为 AiDropdown、ArrayInput、TagTree、ThemeSwitcher 的交互元素添加 `aria-label`/`role`。`<div onClick>` 改为 `<button>` 或添加 `role="button"`。

### 5.7 为 transition 添加 `prefers-reduced-motion`

**问题**：28 处 transition 不尊重用户的减弱动画偏好。

**改动**：在 `globals.css` 中添加全局 `@media (prefers-reduced-motion: reduce)` 规则。

### 5.8 工作区面板按需渲染

**问题**：`app/pages/books/index.tsx` 同时渲染所有面板。

**改动**：改为条件渲染，仅挂载当前激活的面板。

---

## 执行顺序

```
阶段一（数据完整性）→ 阶段二（架构合规）→ 阶段三（后端健壮性）→ 阶段四（前端可靠性）→ 阶段五（CSS 一致性）
```

**原则**：
1. 每个阶段完成后验证 `typecheck + lint + build`
2. 每个阶段的规范更新与代码变更一起提交
3. 不引入新的抽象层、新的工具库、新的设计模式
4. 保持改动范围最小化 — 只改需要改的

## 验证清单

全部阶段完成后：

- [ ] `npm run typecheck` — 零错误
- [ ] `npm run lint` — 零警告
- [ ] `npm run build` — 生产构建通过
- [ ] SQLite `PRAGMA foreign_keys = ON` 已启用
- [ ] 所有高频查询列已建索引
- [ ] `shared/` 中无对 `app/` 的导入
- [ ] 无重复的类型定义（server 端复用 shared/app 类型）
- [ ] 所有 setTimeout 有 cleanup
- [ ] 无 `dangerouslySetInnerHTML` 包含用户数据
- [ ] 有全局 Error Boundary
- [ ] CSS 文件中无未定义的变量引用
- [ ] 无硬编码颜色
- [ ] 删除一本书后无孤儿记录
