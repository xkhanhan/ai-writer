# 重构计划

> 生成日期：2026-07-07 | 分支：`refactor/code-quality`

## 当前状态

- typecheck: 通过, lint: 通过, build: 通过
- 两轮扫描共发现 **75 个问题**

### 问题分布

| 类别 | P0 严重 | P1 高 | P2 中 | P3 低 | 合计 |
|------|---------|-------|-------|-------|------|
| 架构违规 | 3 | 1 | 0 | 0 | 4 |
| 类型安全 | 2 | 3 | 2 | 1 | 8 |
| 数据库 | 3 | 2 | 1 | 1 | 7 |
| 后端正确性 | 4 | 5 | 4 | 5 | 18 |
| React 状态管理 | 3 | 4 | 3 | 2 | 12 |
| CSS 质量 | 3 | 4 | 3 | 2 | 12 |
| 前端工程 | 2 | 3 | 2 | 1 | 8 |
| 安全 | 2 | 2 | 1 | 1 | 6 |
| **合计** | **22** | **24** | **16** | **13** | **75** |

---

## 阶段零：数据库修复（P0 — 数据完整性基础）

> 数据库是应用的根基，外键未启用意味着所有级联删除形同虚设。

### 0.1 启用 SQLite 外键约束

`server/storage/db.ts` 缺少 `PRAGMA foreign_keys = ON`。当前所有 `ON DELETE CASCADE` 声明无效，删除书籍会产生大量孤儿记录（volumes、chapters、world_rules、setting_entities、tag_categories、files、archived_chapters、book_outlines）。

**操作：**
- 在 `getDb()` 单例初始化时添加 `db.pragma("foreign_keys = ON")`
- 验证所有表的 `FOREIGN KEY ... ON DELETE CASCADE` 是否完整（db.ts 中定义的表）

### 0.2 补充数据库索引

当前所有表没有创建任何索引。以下查询是高频路径，缺少索引会导致全表扫描：

| 表 | 应建索引列 | 使用场景 |
|----|-----------|---------|
| `volumes` | `book_id` | `getVolumesByBookId` |
| `chapters` | `volume_id` | `getChaptersByVolumeId` |
| `chapters` | `volume_id, sortOrder` | 排序查询 |
| `files` | `folder_id` | `getFoldersByBookAndCategory` 内部查询 |
| `tag_categories` | `book_id` | `getTagTreeByBookId` |
| `tag_categories` | `book_id, parent_id` | 子节点查询 |
| `setting_entities` | `book_id` | `getSettingEntitiesByBookId` |
| `setting_entities` | `book_id, category` | 按分类查询 |
| `world_rules` | `book_id` | `getWorldRulesByBookId` |
| `archived_chapters` | `book_id` | `getArchivedChapters` |
| `book_outlines` | `book_id` | `getBookOutline` |
| `folders` | `book_id, category` | `getFoldersByBookAndCategory` |

**操作：**
- 在 `initDatabase()` 中添加 `CREATE INDEX IF NOT EXISTS` 语句

### 0.3 统一时间戳生成方式

`book-store.ts` 和 `folder-file-store.ts` 使用 JS `new Date().toISOString()`，其他使用 SQL `datetime('now')`。两种方式产生不同精度的时间格式。

**操作：**
- 全部统一为 SQL `datetime('now')`（在 INSERT/UPDATE 语句中直接使用）

---

## 阶段一：架构修复与类型安全（P0 — 阻塞后续所有工作）

### 1.1 共享类型下沉到 `shared/` [前后端]

`TagCategory` 类型定义在 `app/types/index.ts`，但被 `shared/ui/tag-tree` 和 `shared/ui/tag-selector` 导入 — 违反依赖方向。

**操作：**
- 创建 `shared/types/index.ts`，包含 `TagCategory`、`CreateTagCategoryDTO`、`UpdateTagCategoryDTO`
- 更新 `shared/ui/tag-tree`、`shared/ui/tag-selector`、`app/types/index.ts` 的导入
- 更新 `server/storage/tag-store.ts` 的类型导入

### 1.2 将 `useTagTree` 移到 shared [前端]

`shared/ui/tag-selector/index.tsx` 从 `app/hooks/use-tag-tree` 导入 `useTagTree` — shared 禁止依赖 app。

**操作：**
- 将 `useTagTree` 移至 `shared/hooks/use-tag-tree.ts`

### 1.3 修复 API 路由从 `app/pages/` 导入 [后端]

`app/api/ai/models/route.ts` 从 `app/pages/settings-ai/config/providers` 导入。

**操作：**
- 将 `providers.ts` 配置迁移至 `shared/ai/providers.ts`

### 1.4 消除重复类型定义 [后端]

`server/storage/book-store.ts` 独立定义了 `Book`、`BookOptions` 类型。

**操作：**
- 所有 store 从 `app/types/` 或 `shared/types/` 导入，删除本地类型定义

### 1.5 添加 React Error Boundary [前端]

项目中没有任何 Error Boundary 或 `error.tsx`。组件运行时错误会导致整个应用白屏。

**操作：**
- 在 `app/layout.tsx` 中添加全局 Error Boundary
- 为关键页面添加 `app/**/error.tsx`

### 1.6 修复幽灵 API 端点 [前端+后端]

- `app/pages/books/api/creation.ts` 中 `saveOutline` 使用 `client.post` 但 `/api/outline` 只有 GET 和 PUT
- `key-points` 相关 4 个函数引用不存在的 `/api/key-points`

**操作：**
- 修正 `saveOutline` 为 `client.put`
- 要么创建 `/api/key-points` 路由，要么移除死代码

---

## 阶段二：后端正确性（P1）

### 2.1 统一 API 响应格式 [后端]

当前存在 3 种成功格式 + 3 种错误格式。

**目标格式：**
```
成功: { success: true, data: <载荷> }
错误: { success: false, error: "<错误码>", message: "<描述>" }
```

**操作：**
- 创建 `app/api/utils.ts`，提供 `jsonSuccess(data)` 和 `jsonError(code, message, status)`
- 重构所有路由使用统一工具函数（约 20 个文件）

### 2.2 补充输入校验 [后端]

多个路由直接将 `body` 透传给 store 无任何校验。

**操作：**
- `volumes/route.ts`、`chapters/route.ts`、`outline/route.ts`、`archive/route.ts`：添加必填参数 400 校验
- `books/[id]/route.ts` PATCH：校验 body 字段类型
- 所有 PATCH/PUT 路由：将 `body` 断言为对应 DTO 类型

### 2.3 检查 DELETE 返回值 [后端]

`volumes/[id]`、`chapters/[id]`、`archive/[id]` 未检查删除结果。

**操作：**
- 所有 DELETE 处理器添加 `if (!success) return jsonError("NOT_FOUND", "资源不存在", 404)`

### 2.4 统一 HTTP 方法（PUT → PATCH）[后端]

6 个路由用 PUT 执行部分更新，2 个用 PATCH。

**操作：**
- PUT → PATCH：`volumes/[id]`、`chapters/[id]`、`world-rules/[id]`、`setting-entities/[id]`、`tags/[id]`、`outline`
- 同步更新前端 API 调用

### 2.5 修复 `uniqueCode` 死循环风险 [后端]

`server/storage/tag-store.ts` 的 `uniqueCode` 使用 `while(true)` 无上限。

**操作：**
- 添加 `maxAttempts = 100` 计数器

### 2.6 为多步写操作添加事务 [后端]

`tag-store.ts` `deleteTagCategory` 和 `folder-file-store.ts` `createFile` 无事务保护。

**操作：**
- 用 `db.transaction(() => { ... })` 包裹

### 2.7 AI 调用添加超时保护 [后端]

`app/api/ai/test/route.ts` 和 `server/ai/generate-ai-text.ts` 的 fetch 无超时设置。

**操作：**
- 使用 `AbortController` + `setTimeout` 设置 30s 超时

### 2.8 关闭文件操作改异步 [后端]

`server/ai/ai-config-store.ts` 使用 `fs.readFileSync`/`writeFileSync` 阻塞事件循环。

**操作：**
- 改为 `fs.promises.readFile`/`writeFile`

### 2.9 修复 `ai/config/route.ts` 缺少 try/catch [后端]

GET handler 无错误保护。

**操作：**
- 包裹 try/catch

---

## 阶段三：React 状态管理修复（P1 — 内存泄漏 + 正确性）

### 3.1 修复 `useFolderFileEditor` setTimeout 内存泄漏 [前端]

`app/pages/books/hooks/use-folder-file-editor.ts` 第 123-133 行的 setTimeout 无 cleanup。组件卸载后 timer 仍执行，导致已卸载组件的 setState。

**操作：**
- 添加 `useEffect` cleanup：`return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); }`
- 修复 debounce 期间切换文件导致保存到旧文件的 stale closure bug

### 3.2 修复 `ContentEditor` 渲染期间 setState [前端]

`app/pages/books/components/creation-zone/components/content-editor/index.tsx` 第 25-29 行在渲染函数体内调用 setState。

**操作：**
- 改为 `useEffect`，依赖 `[chapterId]`

### 3.3 修复 XSS 风险 [前端]

`app/pages/books/components/book-info-form/index.tsx` 第 349 行使用 `dangerouslySetInnerHTML` 渲染包含用户标题的 HTML。

**操作：**
- 改用 React 元素渲染（`<b>{a.title}</b>`），或对 title 进行 HTML 转义

### 3.4 为 `useBook` 添加竞态保护 [前端]

`app/pages/books/hooks/use-book.ts` 的 `update` 方法先 PATCH 再 GET，并发调用时可能导致 UI 显示旧数据。

**操作：**
- 添加递增的请求 ID，GET 返回时检查是否为最新请求

### 3.5 为 `useTagTree` 缓存添加 TTL [前端]

`app/hooks/use-tag-tree.ts` 的模块级缓存无失效机制，跨 tab 切换可能返回陈旧数据。

**操作：**
- 为缓存条目添加时间戳，超过 5 分钟自动失效

### 3.6 消除 layout + page 双重数据获取 [前端]

`app/layout.tsx` 和 `app/page.tsx` 各调用一次 `listBooks()`。

**操作：**
- 将 `listBooks` 仅保留在需要的地方，消除重复查询

---

## 阶段四：代码去重复（P1 — 可维护性）

### 4.1 提取前端共享工具函数 [前端]

重复函数：
- `useDebounce` — tag-library、tag-selector、home 三处
- `collectAllIds` / `searchMatch` — tag-library、tag-selector 两处
- `findInTree` / `findTagById` — tag-library、tag-tree 两处

**操作：**
- 创建 `shared/utils/tree-utils.ts` 和 `shared/hooks/use-debounce.ts`

### 4.2 提取 `jsonError` 到共享工具 [后端]

在 3 个路由文件中各自定义。

**操作：**
- 合并到 `app/api/utils.ts`（与阶段 2.1 同步）

### 4.3 提取 `parseJsonSafe` 到共享工具 [后端]

在 3 个 store 文件中各自实现。

**操作：**
- 创建 `server/utils/json.ts`

### 4.4 提取 `buildUpdateQuery` 工具函数 [后端]

6 个 store 的 update 函数使用相同的 if-push 拼接模式。

**操作：**
- 创建 `server/utils/query-builder.ts`

### 4.5 去重 `deleteBook` API 函数 [前端]

两处定义了相同的 `deleteBook`。

**操作：**
- 仅保留在 `app/pages/home/api/books.ts`

### 4.6 清理幽灵代码 [前端+后端]

- `app/pages/books/api/creation.ts` 中 `key-points` 相关 4 个函数
- `shared/ui/save-button/index.module.css` 完全未使用
- `server/storage/file-store.ts` — 废弃的 JSON 文件存储
- `server/utils/id-generator.ts` — 未使用
- `server/storage/db.ts` 中的 `closeDb()` — 从未被调用

---

## 阶段五：CSS 质量提升（P2）

### 5.1 修复未定义的 CSS 变量引用 [前端]

5 个 CSS 文件引用了 `globals.css` 中不存在的变量：

| 变量 | 影响 |
|------|------|
| `--text-muted` | empty-state、array-input、content-library 文字颜色失效 |
| `--color-danger` | array-input 删除图标颜色失效 |
| `--surface-container-highest` | home 书籍卡片边框色失效 |
| `--surface-variant` | home 书籍封面背景色失效 |

**操作：**
- 在 `globals.css` 中定义这些变量，或将引用替换为已有变量

### 5.2 硬编码颜色替换为 CSS 变量 [前端]

| 文件 | 硬编码数量 | 问题 |
|------|-----------|------|
| `foreshadow-library/index.module.css` | 14 | 状态标签颜色不随主题变化 |
| `empty-state/index.module.css` | 2 | 图标/描述色深色模式对比度不足 |
| `ai-dropdown/index.module.css` | 2 | 背景色/禁用色不随主题变化 |
| `save-button/index.module.css` | 1 | 背景色白色 |
| `content-library/index.module.css` | 1 | 背景色白色 |
| `book-info-form/index.module.css` | 5 | rgba 硬编码主色值 |
| `home/index.module.css` | 3 | rgba 硬编码 |

**操作：**
- 全部替换为对应的 CSS 变量

### 5.3 移除 `!important` 覆盖 [前端]

9 处 `!important`，其中 book-info-form 4 处覆盖 antd Button 样式。

**操作：**
- 通过 CSS Modules 类嵌套或 antd ConfigProvider tokens 替代

### 5.4 清理 globals.css 冗余变量 [前端]

`--collapse-*`、`--tag-*`、`--filter-*` 共 11 个变量在全部 CSS 模块中均未使用。

**操作：**
- 删除未使用的变量定义

### 5.5 统一 CSS 命名体系 [前端]

`globals.css` 中存在新旧两套命名体系（`--color-primary` vs `--accent`），组件混用。

**操作：**
- 统一为新体系（`--color-*`、`--bg-*`、`--text-*`），旧别名标记为 deprecated

### 5.6 补全 ThemeProvider 缺失的变量注入 [前端]

ThemeProvider 只注入 17 个变量，遗漏了 `--color-primary-bg`、`--color-primary-bg-hover`、`--color-primary-border`、功能色等。

**操作：**
- 扩展 `ThemeColors` 接口，补全所有需要随主题变化的变量

---

## 阶段六：前端体验优化（P2）

### 6.1 用明确 DTO 替代 `Record<string, unknown>` [前端]

`app/pages/books/api/creation.ts` 的 volume/chapter 操作使用宽松类型。

**操作：**
- 在 `app/types/` 中定义 `CreateVolumeDTO`、`UpdateVolumeDTO`、`CreateChapterDTO`、`UpdateChapterDTO`

### 6.2 统一消息提示方式 [前端]

`navigation-tree` 和 `content-editor` 使用 `message.success/error`。

**操作：**
- 全部替换为 `showSuccess/showError/showWarning`

### 6.3 工作区面板改为按需渲染 [前端]

`app/pages/books/index.tsx` 同时渲染所有面板。

**操作：**
- 改为条件渲染：仅挂载当前激活的面板组件

### 6.4 补充无障碍属性 [前端]

全项目仅 2 处 `aria-label`，共享 UI 组件零 `aria-*`/`role` 属性。

**操作：**
- 为 AiDropdown、ArrayInput、TagTree、ThemeSwitcher 的交互元素添加 `aria-label`/`role`
- `<div onClick>` 改为 `<button>` 或添加 `role="button"` + `tabIndex` + `onKeyDown`

### 6.5 为 transition 添加 `prefers-reduced-motion` [前端]

28 处 `transition` 均不尊重用户的减弱动画偏好。

**操作：**
- 在 `globals.css` 中添加全局 `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition-duration: 0.01ms !important; } }`

---

## 执行顺序

```
阶段零（数据库）→ 最先完成，数据完整性是一切的基础
  ↓
阶段一（架构修复）→ 阻塞后续所有工作
  ↓
阶段二（后端正确性）+ 阶段三（React 状态管理）+ 阶段四（去重复）→ 可并行
  ↓
阶段五（CSS 质量）+ 阶段六（前端体验）→ 最后
```

每个阶段应单独提交。每个阶段完成后必须验证 `typecheck + lint + build`。

## 验证清单

全部阶段完成后：
- [ ] `npm run typecheck` — 零错误
- [ ] `npm run lint` — 零警告
- [ ] `npm run build` — 生产构建通过
- [ ] SQLite `PRAGMA foreign_keys = ON` 已启用
- [ ] 所有高频查询列已建索引
- [ ] `shared/` 中无对 `app/` 的导入
- [ ] CSS 文件中无硬编码颜色
- [ ] 所有 API 路由使用统一的 `{ success, data/error }` 格式
- [ ] 所有 DELETE 处理器检查返回值
- [ ] 所有 setTimeout 有 cleanup
- [ ] 无 `dangerouslySetInnerHTML` 包含用户数据
- [ ] 有全局 Error Boundary
- [ ] 无 `message.error/success` — 全部使用 showError/showSuccess
