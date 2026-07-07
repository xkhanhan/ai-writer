# Architecture Standards

## 适用场景

本规范适用于 AI Writer 项目的整体架构设计、四层依赖方向管控、数据库设计规范及页面间通信机制。所有新增模块、重构操作必须遵循本规范定义的架构约束。

---

# Architecture

## 四层结构

```
app/       → Next.js 页面、API 路由、hooks、api-client、类型定义
server/    → 数据库访问、AI provider、服务器工具（禁止客户端导入）
shared/    → 跨功能复用的 UI 组件、类型定义、hooks、工具函数、AI 契约
data/      → 运行时数据（SQLite、JSON 配置，不提交到 Git）
```

## 依赖方向（严格单向，禁止反向）

```
允许：
  app/    → server/    （仅通过 app/api/ 路由）
  app/    → shared/    （导入组件、类型、hooks、工具函数）
  server/ → shared/    （导入共享类型）
  server/ → data/      （读写数据库和文件）

禁止：
  server/ → app/
  shared/ → app/       （这是最常见的架构违规）
  shared/ → server/
  app/ 直接导入 server/storage/*
```

**关键理解：** `shared/` 是最底层，不依赖任何其他层。如果 `shared/` 需要使用某个类型或 hook，该类型/hook 必须定义在 `shared/` 内部。

## 目录职责

### app/ — 应用层

| 目录 | 职责 | 约束 |
|------|------|------|
| `app/pages/{page}/` | 页面级组件 | 按路由组织 |
| `app/pages/{page}/components/` | 页面专属 UI 组件 | 仅该页面使用时放这里 |
| `app/pages/{page}/hooks/` | 页面专属 React hooks | 仅该页面使用时放这里 |
| `app/pages/{page}/api/` | 页面专属 API helper | 仅该页面使用时放这里 |
| `app/api/*/route.ts` | API 路由适配器 | **禁止**业务逻辑 |
| `app/api-client/` | API Client + 跨页面 API helper | `Result<T>` 模式 |
| `app/components/` | App Shell 布局组件 | 仅布局相关 |
| `app/types/` | **仅前端特有的类型** | 全栈共享类型放 `shared/types/` |
| `app/utils/` | 仅前端使用的工具函数 | 如 `error-handler`、`format-date` |

### server/ — 服务端层

| 目录 | 职责 | 约束 |
|------|------|------|
| `server/storage/db.ts` | 数据库连接单例 + 迁移 | 唯一的 DB 入口 |
| `server/storage/*-store.ts` | 单表 CRUD | 每表一个文件，导出独立函数 |
| `server/storage/migrations/` | 数据库迁移 | 幂等迁移（PRAGMA 检查列是否存在） |
| `server/ai/` | AI provider 访问 | 配置读写、文本生成 |
| `server/utils/` | 服务器工具函数 | 如 `json.ts`、`query-builder.ts` |

### shared/ — 共享层（最底层）

| 目录 | 职责 | 约束 |
|------|------|------|
| `shared/types/` | **全栈共享类型** | Entity、DTO、枚举 |
| `shared/hooks/` | 跨页面共享 hooks | 如 `use-tag-tree.ts`、`use-debounce.ts` |
| `shared/utils/` | 跨页面共享工具函数 | 如 `tree-utils.ts` |
| `shared/ui/` | 设计系统组件 | 纯 UI，无业务逻辑 |
| `shared/ai/` | AI provider 契约 | Config 类型、provider 定义 |

## 组件放置决策流程

```
需要在多个页面使用？
  → 是 → shared/ui/ 或 shared/hooks/
  → 否 → 仅当前页面使用？
            → 是 → app/pages/{page}/components/
            → 否 → 是否跨全站？
                    → 是 → app/components/
                    → 否 → 放在使用它的最小范围内
```

**注意：** 当组件从"页面专属"变为"被第二个页面使用"时，立即迁移到 `shared/`。

## 页面间通信

页面通过自定义事件与 Topbar 通信（如 `navigate-settings`），**禁止**直接导入。

```typescript
// ✅ 事件派发
window.dispatchEvent(new CustomEvent("navigate-settings"));

// ✅ 事件监听（带 cleanup）
useEffect(() => {
  const handler = () => handleGoToSettings();
  window.addEventListener("navigate-settings", handler);
  return () => window.removeEventListener("navigate-settings", handler);
}, [handleGoToSettings]);
```

## API 路由规则

路由文件是**薄适配器**，职责仅三项：
1. 解析请求参数
2. 调用 `server/` 函数
3. 返回 JSON

**禁止：** 业务逻辑、数据库操作、验证逻辑出现在路由文件中。

## 数据库规范

- 引擎：SQLite via `better-sqlite3`
- 文件：`data/novel-writer.db`
- 连接：`getDb()` 单例（`server/storage/db.ts`）
- SQL：**必须参数化**，禁止字符串拼接
- 类型断言：`as unknown as RowType`，禁止 `as any`
- 类型定义：全栈共享类型放 `shared/types/`，Row 类型在 store 文件内定义
- 外键：**必须启用** `PRAGMA foreign_keys = ON`
- 索引：所有外键列和高频查询列必须建索引
- 事务：多步写操作必须包裹在 `db.transaction()` 中
- 时间戳：统一使用 SQL `datetime('now')`，禁止在 JS 层生成
- 迁移：幂等迁移（PRAGMA 检查列是否存在），按顺序执行
- `data/` 运行时文件**不提交**到 Git

---

## 合规校验标准

| # | 校验项 | 自动化 | 手动 |
|---|--------|--------|------|
| A-1 | 四层依赖方向正确（shared 不依赖 app/server） | 架构检查脚本 | Code Review |
| A-2 | API 路由无业务逻辑 | Code Review | — |
| A-3 | shared/types/ 包含所有全栈共享类型 | 类型检查 | Code Review |
| A-4 | 服务端禁止客户端导入 | ESLint 自定义规则 | — |
| A-5 | 数据库使用参数化查询 | 搜索 `db.prepare(\`` | — |
| A-6 | 外键约束已启用（PRAGMA foreign_keys = ON） | 代码检查 | — |
| A-7 | 外键列有索引 | 迁移脚本审查 | — |
| A-8 | 多步写操作使用事务 | Code Review | — |
| A-9 | 时间戳使用 SQL datetime('now') | Code Review | — |
| A-10 | 页面间通信使用自定义事件 | Code Review | — |

## 违规整改方案

| 违规 | 级别 | 整改方式 | 时限 |
|------|------|---------|------|
| shared/ 导入 app/ 或 server/ | P0 | 立即重构，将共享类型移至 shared/types/ | 立即 |
| API 路由包含业务逻辑 | P1 | 提取业务逻辑到 server/ 函数 | 当前迭代 |
| 数据库未使用参数化查询 | P0 | 立即重构为参数化查询 | 立即 |
| 外键约束未启用 | P1 | 在 db.ts 中添加 PRAGMA foreign_keys = ON | 当前迭代 |
| 缺失外键索引 | P2 | 补充 CREATE INDEX 迁移 | 当前迭代 |
| 页面间直接 import 通信 | P1 | 重构为自定义事件模式 | 当前迭代 |
| 时间戳在 JS 层生成 | P2 | 改为 SQL datetime('now') | 当前迭代 |
