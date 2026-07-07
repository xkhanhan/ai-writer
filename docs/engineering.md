# Engineering Standards

## 概述

本文档定义工程化实践：当业务扩展时，如何新增功能模块、维护代码质量、保证长期可维护性。

---

## 一、新增功能模块 Checklist

当需要新增一个实体（如"任务系统"、"评论系统"）时，按以下顺序执行：

### 1. 数据层

```
server/storage/migrations/   → 新增迁移函数（幂等）
server/storage/db.ts         → 注册迁移 + 创建表 + 建索引
server/storage/task-store.ts → 新增 store 文件
```

**表设计要求：**
- 必须有 `id TEXT PRIMARY KEY`（UUID）
- 必须有 `book_id TEXT NOT NULL`（多租户隔离）
- 必须有 `created_at TEXT DEFAULT (datetime('now'))`
- 必须有 `updated_at TEXT DEFAULT (datetime('now'))`
- 外键列必须建索引
- 外键使用 `ON DELETE CASCADE`

### 2. 类型层

```
shared/types/index.ts  → 新增 Entity 类型 + DTO + 枚举
```

**命名约定：**
- Entity：`Task`（单数，PascalCase）
- Create DTO：`CreateTaskDTO`
- Update DTO：`UpdateTaskDTO`
- Row 类型：`TaskRow`（保留在 store 文件内）
- 枚举：`type TaskStatus = "pending" | "active" | "done"`

### 3. API 层

```
app/api/tasks/route.ts      → GET（列表） + POST（创建）
app/api/tasks/[id]/route.ts → GET（单条） + PATCH（更新） + DELETE（删除）
app/api-client/tasks.ts     → API helper（漏斗式 Result<T>）
```

**路由层规则：**
- 使用 `jsonSuccess()` / `jsonError()` 统一响应
- 所有 handler 包裹 try/catch
- 必填参数检查后返回 400
- DELETE 检查返回值
- PATCH 前校验 body 字段类型

### 4. 前端页面

```
app/pages/books/components/task-list/index.tsx      → 主组件
app/pages/books/components/task-list/index.module.css → 样式
app/pages/books/hooks/use-tasks.ts                  → 业务 hook（如需要）
```

**组件规则：**
- 使用 SplitPanel（列表+详情）
- 弹窗使用 BaseModal
- 删除使用 confirmDelete
- 消息使用 showError/showSuccess
- 样式使用 CSS Modules + CSS 变量
- 超过 200 行拆分子组件

### 5. 注册到路由

```
app/pages/books/components/book-workspace.tsx  → 在 workspacePanels 中注册
app/types/index.ts → ActivePanel 联合类型中添加新面板 ID
```

---

## 二、新增共享组件 Checklist

当一个 UI 组件需要被 2 个以上页面使用时：

```
shared/ui/my-component/index.tsx        → 组件实现
shared/ui/my-component/index.module.css → 样式
shared/types/index.ts                   → Props 类型定义（如需要）
```

**要求：**
- 纯 UI，不依赖 `app/` 或 `server/`
- Props 接口完整，使用 TypeScript 泛型
- 处理空状态和加载状态
- 无障碍：aria-label、role、tabIndex
- CSS 使用变量，禁止硬编码颜色

---

## 三、新增共享 Hook Checklist

当一个 hook 需要被 2 个以上页面使用时：

```
shared/hooks/use-xxx.ts → hook 实现
```

**要求：**
- 不依赖 `app/pages/` 下的任何模块
- 依赖 `shared/types/` 和 `shared/utils/`
- 导出类型：`type UseXxxReturn = ReturnType<typeof useXxx>`
- 清理所有副作用（timer、listener、subscription）
- 使用 cancelled flag 或 AbortController 防止卸载后 setState

---

## 四、新增数据库表 Checklist

```
1. 在 db.ts 中定义表结构（CREATE TABLE IF NOT EXISTS）
2. 定义外键约束（FOREIGN KEY ... ON DELETE CASCADE）
3. 创建索引（CREATE INDEX IF NOT EXISTS）
4. 如需事务，在 store 函数中使用 db.transaction()
5. 时间戳统一使用 datetime('now')
```

**索引策略：**
- 所有外键列必须建索引
- 经常用于 WHERE 查询的列建索引
- 经常用于 ORDER BY 的列与过滤列联合建索引
- 不要过度索引（写入性能影响）

---

## 五、CSS 变量管理

### 新增变量流程

```
1. 在 app/globals.css :root 中定义变量
2. 判断是否需要随主题变化：
   → 是 → 添加到 shared/ui/theme/themes.ts 的 ThemeColors 接口
        → 在4个主题中定义对应值
        → 在 theme-provider.tsx 中添加注入
   → 否 → 仅在 :root 中定义即可
3. 在组件中使用 var(--xxx)
```

### 禁止

- 硬编码颜色值（hex、rgb、rgba）
- `!important`
- `:global(.ant-xxx)` 覆盖
- 引用未在 globals.css 中定义的变量

---

## 六、代码质量门禁

### 提交前必须通过

| 检查 | 命令 | 后果 |
|------|------|------|
| 类型安全 | `npm run typecheck` | 零错误 |
| 代码规范 | `npm run lint` | 零警告 |
| 构建验证 | `npm run build` | 生产构建通过 |

### 代码审查重点

新增代码必须检查：

- [ ] 依赖方向正确（shared 不依赖 app/server）
- [ ] API 使用漏斗式错误处理（Result<T>）
- [ ] 消息使用 showError/showSuccess（非 message.error）
- [ ] 删除使用 confirmDelete
- [ ] 弹窗使用 BaseModal
- [ ] 列表+详情使用 SplitPanel
- [ ] CSS 使用变量（无硬编码颜色）
- [ ] setTimeout 有 cleanup
- [ ] 无 try/catch 在 Hook/组件中处理 API 错误
- [ ] 数据库操作参数化
- [ ] 外键列有索引

---

## 七、性能预算

### 前端

| 指标 | 预算 |
|------|------|
| 首屏加载 | < 3s（本地环境） |
| 面板切换 | < 200ms |
| 列表渲染（100项） | < 100ms |
| 搜索响应 | < 300ms（防抖后） |

### 后端

| 指标 | 预算 |
|------|------|
| 单次查询 | < 50ms |
| 列表 API（50条） | < 100ms |
| 创建/更新 | < 50ms |
| AI 调用 | 30s 超时 |

### 达不到预算时的优化方向

1. 检查是否有 N+1 查询 → 改为 JOIN 或批量查询
2. 检查是否有缺失索引 → 补充索引
3. 检查是否有不必要的全量渲染 → 使用 React.memo 或条件渲染
4. 检查是否有大型组件同时渲染 → 改为按需渲染

---

## 八、数据库增长策略

### 数据量预估

| 实体 | 预估量级 | 说明 |
|------|---------|------|
| books | 10-50 | 用户书籍 |
| volumes | 5-20/book | 卷纲 |
| chapters | 50-200/volume | 章纲 |
| setting_entities | 100-500/book | 设定条目 |
| tag_categories | 50-200/book | 标签 |
| archived_chapters | 50-200/book | 存稿 |

### 当数据量增长时

| 场景 | 方案 |
|------|------|
| 列表查询变慢 | 检查索引 → 添加复合索引 |
| 树构建变慢 | 缓存 tree 结果（useTagTree 已实现） |
| JSON 字段查询变慢 | 考虑拆分为关联表 |
| 单表超过 10万行 | 考虑分区或归档策略 |

---

## 九、错误追踪

### 当前机制

- Store 层抛异常 → API 路由 catch → `jsonError()` 返回结构化错误
- API Client 捕获 → `Result<T>` 返回
- Hook 检查 → `showError()` 提示用户

### 需要补充

| 场景 | 当前 | 目标 |
|------|------|------|
| 生产环境错误 | 仅 console.error | 接入错误追踪服务（如 Sentry） |
| AI 调用失败 | show 错误消息 | 记录请求/响应日志 |
| 数据库错误 | 500 通用错误 | 返回具体错误码便于排查 |

---

## 十、模块拆分指南

当一个文件过大时的拆分策略：

| 文件类型 | 超过行数 | 拆分方式 |
|---------|---------|---------|
| 组件文件 | 200 行 | 提取子组件到独立文件 |
| Hook 文件 | 150 行 | 拆分为多个职责单一的 hook |
| Store 文件 | 200 行 | 按功能拆分（如 book-store 拆为 book-crud + book-query） |
| CSS 文件 | 150 行 | 提取到子组件的 CSS Module |
| 类型文件 | 100 行 | 按领域拆分（book.ts、creation.ts、tag.ts） |
| API 路由 | 100 行 | 提取 handler 到独立函数 |

### 拆分原则

- 一个文件 = 一个职责
- 文件之间通过 import 交互
- 拆分后不影响外部 API（导出接口不变）
- 拆分时同步更新文档中的文件索引
