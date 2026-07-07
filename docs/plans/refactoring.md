# 重构计划

> 生成日期：2026-07-07 | 分支：`refactor/code-quality`

## 当前状态

- typecheck: 通过, lint: 通过, build: 通过
- 前端问题：31 个（严重 10、中等 15、轻微 6）
- 后端问题：20 个（严重 6、中等 6、轻微 8）

---

## 阶段一：架构修复与类型安全（高优先级 — 阻塞后续所有工作）

### 1.1 共享类型下沉到 `shared/` [前后端]

`TagCategory` 类型定义在 `app/types/index.ts`，但被 `shared/ui/tag-tree` 和 `shared/ui/tag-selector` 导入 — 违反依赖方向（shared 禁止依赖 app）。

**操作：**
- 创建 `shared/types/index.ts`，包含 `TagCategory`、`CreateTagCategoryDTO`、`UpdateTagCategoryDTO`
- 更新 `shared/ui/tag-tree`、`shared/ui/tag-selector`、`app/types/index.ts`（从 shared 重新导出）的导入
- 更新 `server/storage/tag-store.ts` 的类型导入指向 `shared/types`

### 1.2 将 `useTagTree` 从 app 移到 shared [前端]

`shared/ui/tag-selector/index.tsx` 从 `app/hooks/use-tag-tree` 导入 `useTagTree` — shared 禁止依赖 app。

**操作：**
- 将 `useTagTree` 移至 `shared/hooks/use-tag-tree.ts`
- 或：让 TagSelector 通过 prop 接收树数据，而非内部获取

### 1.3 修复 API 路由从 `app/pages/` 导入的问题 [后端]

`app/api/ai/models/route.ts` 从 `app/pages/settings-ai/config/providers` 导入 `getProviderById` — 路由依赖页面模块。

**操作：**
- 将 `providers.ts` 配置迁移至 `shared/ai/providers.ts`
- 更新路由和页面的导入

### 1.4 消除重复类型定义 [后端]

`server/storage/book-store.ts` 独立定义了 `Book` 类型，与 `app/types/index.ts` 中的 `Book` 接口内容一致但各自维护。

**操作：**
- 所有 store 文件从 `app/types/`（或阶段 1.1 完成后的 `shared/types/`）导入类型
- 删除 store 文件中的本地类型定义

---

## 阶段二：后端清理（高优先级 — 正确性与一致性）

### 2.1 统一 API 响应格式 [后端]

当前路由中存在 3 种成功格式和 3 种错误格式。

**目标格式：**
```
成功: { success: true, data: <载荷> }
错误: { success: false, error: "<错误码>", message: "<描述>" }
```

**操作：**
- 创建 `app/api/utils.ts`，提供 `jsonSuccess(data)` 和 `jsonError(code, message, status)` 工具函数
- 重构所有路由使用统一工具函数
- 影响范围：所有 `app/api/*/route.ts`（约 20 个文件）

### 2.2 补充缺失的输入校验 [后端]

多个路由在查询参数缺失时传入空字符串 `""` 作为默认值。

**操作：**
- 在 `volumes/route.ts`、`chapters/route.ts`、`outline/route.ts`、`archive/route.ts` 中添加必填参数的 400 校验
- 在 `books/[id]/route.ts` PATCH 处理器中校验 body 字段

### 2.3 检查 DELETE 返回值 [后端]

`volumes/[id]`、`chapters/[id]`、`archive/[id]` 未检查删除结果。

**操作：**
- 所有 DELETE 处理器添加 `if (!success) return jsonError("NOT_FOUND", "资源不存在", 404)`

### 2.4 为未保护的路由添加 try/catch [后端]

`app/api/ai/config/route.ts` GET 没有 try/catch。

**操作：**
- 所有路由处理器包裹 try/catch（使用统一的 `jsonError`）

### 2.5 修复 `uniqueCode` 死循环风险 [后端]

`server/storage/tag-store.ts` 的 `uniqueCode` 函数使用 `while(true)` 无上限退出条件。

**操作：**
- 添加 `maxAttempts = 100` 计数器，超出后抛出异常

### 2.6 为多步写操作添加事务 [后端]

`tag-store.ts` 的 `deleteTagCategory` 和 `folder-file-store.ts` 的 `createFile` 执行多次写操作但无事务保护。

**操作：**
- 用 `db.transaction(() => { ... })` 包裹，保证原子性

### 2.7 统一 HTTP 方法（PUT → PATCH）[后端]

6 个路由用 PUT 执行部分更新，2 个用 PATCH。应统一为 PATCH。

**操作：**
- 将以下路由的 PUT 改为 PATCH：`volumes/[id]`、`chapters/[id]`、`world-rules/[id]`、`setting-entities/[id]`、`tags/[id]`、`outline`
- 同步更新前端 API 调用

### 2.8 统一时间戳生成方式 [后端]

`book-store.ts` 和 `folder-file-store.ts` 使用 JS `new Date().toISOString()`，其他使用 SQL `datetime('now')`。

**操作：**
- 全部统一为 SQL `datetime('now')`（格式一致）

---

## 阶段三：代码去重复（中等优先级 — 可维护性）

### 3.1 提取前端共享工具函数 [前端]

以下函数在多个文件中重复定义：
- `useDebounce` — tag-library、tag-selector、home 三处
- `collectAllIds` / `searchMatch` — tag-library、tag-selector 两处
- `findInTree` / `findTagById` — tag-library、tag-tree 两处

**操作：**
- 创建 `shared/utils/tree-utils.ts`，包含 `collectAllIds`、`searchMatch`、`findInTree`
- 创建 `shared/hooks/use-debounce.ts`，包含 `useDebounce`

### 3.2 提取 `jsonError` 到共享工具 [后端]

在 3 个路由文件中各自定义。

**操作：**
- 合并到 `app/api/utils.ts`（与阶段 2.1 同步完成）

### 3.3 提取 `parseJsonSafe` 到共享工具 [后端]

在 3 个 store 文件中各自实现。

**操作：**
- 创建 `server/utils/json.ts`，提供 `parseJsonSafe<T>(json: string | null, fallback: T): T`

### 3.4 提取 `buildUpdateQuery` 工具函数 [后端]

6 个 store 文件的 update 函数使用相同的 if-push 拼接模式。

**操作：**
- 创建 `server/utils/query-builder.ts`，提供 `buildUpdateQuery(fields, allowedFields)`
- 重构所有 store 的 update 函数使用该工具

### 3.5 去重 `deleteBook` API 函数 [前端]

`app/pages/home/api/books.ts` 和 `app/pages/books/api/books.ts` 中各定义了一个相同的 `deleteBook`。

**操作：**
- 仅保留在 `app/pages/home/api/books.ts`，books 页面导入使用

---

## 阶段四：前端质量提升（中等优先级 — 性能与体验）

### 4.1 硬编码颜色替换为 CSS 变量 [前端]

`foreshadow-library/index.module.css` 有 14 处硬编码十六进制颜色。

**操作：**
- 所有 `#ffffff` → `var(--bg-elevated)` 或 `var(--text-inverse)`
- 所有 `#6b7280` → `var(--text-secondary)`
- 彩色状态背景替换为对应的 CSS 变量组合
- `book-info-form` 中的 `rgba(47, 93, 80, ...)` → 使用 `var(--color-primary)` 派生值

### 4.2 移除 `!important` 覆盖 [前端]

4 个文件中共 9 处 `!important`。

**操作：**
- 通过 CSS Modules 类嵌套提升优先级，替代 `!important`

### 4.3 修复渲染期间调用 setState [前端]

`content-editor/index.tsx` 在渲染函数体内直接调用 setState。

**操作：**
- 改为 `useEffect`，设置正确的依赖数组

### 4.4 工作区面板改为按需渲染 [前端]

`app/pages/books/index.tsx` 同时渲染所有面板，用 CSS display:none 隐藏。

**操作：**
- 改为条件渲染：仅挂载当前激活的面板组件

### 4.5 用明确 DTO 替代 `Record<string, unknown>` [前端]

`app/pages/books/api/creation.ts` 对 volume/chapter 操作使用宽松类型。

**操作：**
- 在 `app/types/` 中定义 `CreateVolumeDTO`、`UpdateVolumeDTO`、`CreateChapterDTO`、`UpdateChapterDTO`
- 在 API 函数中使用

### 4.6 统一消息提示方式 [前端]

`navigation-tree` 和 `content-editor` 使用 antd 的 `message.success/error` 而非 `showSuccess/showError`。

**操作：**
- 所有 `message.success/error/warning` 替换为 `showSuccess/showError/showWarning`

---

## 阶段五：死代码清理（低优先级 — 工程卫生）

### 5.1 删除无用文件

- `server/storage/file-store.ts` — 已废弃的 JSON 文件存储
- `server/utils/id-generator.ts` — 未使用（所有 store 用 `randomUUID`）
- `server/storage/db.ts` 中的 `closeDb()` 函数 — 从未被调用

### 5.2 清理死代码模式

- `book-options-store.ts` 的 `getBookOptions` 在读操作中执行写入 — 分离读写
- `ai-config-store.ts` 使用同步 IO → 改为异步 `fs.promises`

---

## 执行顺序

```
阶段一（架构修复）→ 必须最先完成
  ↓
阶段二（后端清理）+ 阶段三（去重复）→ 可并行执行
  ↓
阶段四（前端质量）→ 阶段一类型稳定后执行
  ↓
阶段五（死代码清理）→ 最后
```

每个阶段应单独提交（或视规模创建 PR）。每个阶段完成后必须验证 `typecheck + lint + build`。

## 验证清单

全部阶段完成后：
- [ ] `npm run typecheck` — 零错误
- [ ] `npm run lint` — 零警告
- [ ] `npm run build` — 生产构建通过
- [ ] `shared/` 中无对 `app/` 的导入
- [ ] CSS 文件中无硬编码颜色
- [ ] 所有 API 路由使用统一的 `{ success, data/error }` 格式
- [ ] 所有 DELETE 处理器检查返回值
- [ ] API 函数中无 `Record<string, unknown>`
- [ ] 无 `message.error/success` — 全部使用 showError/showSuccess
