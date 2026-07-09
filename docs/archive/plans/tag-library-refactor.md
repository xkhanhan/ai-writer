# 标签库重构 — 完整开发计划

> 版本：v2.0 | 更新日期：2026-07-07
> 参考规范：AGENTS.md、docs/frontend/\*、docs/backend/\*、docs/management/\*

---

## 一、重构目标

将标签库从「能用」提升到「好用」，解决功能缺失、架构违规、数据一致性和 UX 问题，使其成为设定库、正文创作等模块的可靠基础设施。

### 核心原则

1. **架构合规**：严格遵循 AGENTS.md 四层架构，依赖方向不可违反
2. **漏斗式错误处理**：API Client → Result\<T\> → Hook → 页面组件，业务不承接 try/catch
3. **简约放置 + 详细链接**：AI 可第一时间理解关键信息
4. **安全优先**：输入验证、SQL 参数化、关联清理、权限边界

---

## 二、现状问题清单

### P0 — 功能缺失

| # | 问题 | 位置 | 说明 |
|---|------|------|------|
| 1 | code 字段未系统自动生成 | tag-store / TagLibrary | 数据库有 code 字段，但创建时未自动生成，UI 也无展示 |
| 2 | 标签删除不清理关联 | tag-store | 删除标签后 setting_entities.tag_ids 中的孤立 ID 不被清除 |
| 3 | 无标签搜索 | TagLibrary | 标签多时只能逐级展开浏览 |
| 4 | shared 组件反向依赖 | tag-selector → pages/books/api | shared/ui 引用 pages 层，违反依赖方向 |

### P1 — 架构一致性

| # | 问题 | 位置 | 说明 |
|---|------|------|------|
| 5 | TagLibrary 未使用 SplitPanel | tag-library | 自行实现左右分栏，违反 AGENTS.md |
| 6 | 树渲染方式不一致 | TagLibrary 手写递归 vs TagSelector 用 antd Tree | 两处独立实现 |
| 7 | fetchTagTree 重复请求 | settings-library + tag-selector | 同一页面同一 book 被请求两次 |

### P2 — 体验优化

| # | 问题 | 位置 | 说明 |
|---|------|------|------|
| 8 | 无使用统计 | 删除确认 | 删除前不提示引用数量 |
| 9 | 编辑按钮仅 hover 可见 | tag-library CSS | 触摸设备不友好 |
| 10 | 树展开状态无持久化 | expandedIds | 刷新后需重新展开 |

---

## 三、技术方案

### 3.1 编码自动生成策略

编码（code）由后端在创建标签时根据名称自动生成，规则：
- 取标签名称的拼音首字母或英文翻译（简单实现：取名称的 kebab-case 拼音）
- 同级去重：若生成的 code 与同级已有 code 冲突，追加数字后缀
- 用户不可编辑，UI 展示为只读

```typescript
// tag-store.ts — generateCode()
function generateCode(name: string): string {
  // 简单实现：取名称的 URL-safe 拼音编码
  // 后续可接入 pinyin 库实现更精确的转换
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
```

### 3.2 API 迁移至通用模块

**之前**：`app/pages/books/api/tags.ts`
**之后**：`app/api-client/tags.ts`

违反的规范条款：AGENTS.md Architecture Rules — "Put reusable cross-feature code in `shared/ui/`"。标签 API 被 TagSelector（shared）和 TagLibrary（pages/books）同时使用，应提升到 api-client 层。

### 3.3 全局缓存 Hook

新增 `app/hooks/use-tag-tree.ts`，同一 bookId 只请求一次，多组件共享。

### 3.4 数据一致性：删除级联清理

后端 `deleteTagCategory` 执行后，自动扫描 `setting_entities.tag_ids` 并移除被删除标签的 ID。

### 3.5 删除前引用计数

新增 API `GET /api/tags/:id/refs`，返回引用该标签的设定实体数量。删除确认弹窗中展示此信息。

### 3.6 TagLibrary 接入 SplitPanel + antd Tree

- 左右分栏改用 `shared/ui/split-panel`
- 树渲染改用 antd `Tree` 组件
- 左侧边栏增加搜索框

---

## 四、安全防护清单

### 4.1 输入验证

| 层级 | 措施 | 位置 |
|------|------|------|
| 前端表单 | Form.Item rules 校验名称非空、长度限制 | TagLibrary 表单 |
| API 路由 | 校验 bookId/name 必填、类型正确 | app/api/tags/route.ts |
| Store 层 | SQL 参数化查询，禁止字符串拼接 | tag-store.ts |

### 4.2 SQL 注入防护

- 所有 SQL 使用 `?` 参数化占位符
- 禁止 `SELECT * FROM ... WHERE ... = '${variable}'`
- 验证：grep 代码库确认无字符串拼接 SQL

### 4.3 数据一致性

| 风险 | 防护 |
|------|------|
| 删除标签后 setting_entities 残留孤立 ID | 后端级联清理 |
| 删除含子标签的父标签 | 递归删除所有子节点 |
| 并发创建同名标签 | 允许同名（不同 ID），code 去重由后端保证 |

### 4.4 依赖方向防护

- shared/ui/tag-selector 禁止引用 app/pages/ 下的模块
- 迁移后通过 TypeScript 编译 + ESLint 验证

### 4.5 错误处理

- API Client 统一拦截所有异常，返回 Result\<T\>
- Hook 层检查 result.ok，调用 showError/showSuccess
- 页面组件无 try/catch

---

## 五、文件变更清单

### 新建（3 个）

| 文件 | 说明 | 层级 |
|------|------|------|
| `app/api-client/tags.ts` | 通用标签 API（从 pages 迁移） | app |
| `app/hooks/use-tag-tree.ts` | 标签树全局缓存 Hook | app |
| `app/api/tags/[id]/refs/route.ts` | 标签引用计数 API | app/api |

### 修改（6 个）

| 文件 | 变更内容 |
|------|----------|
| `server/storage/tag-store.ts` | 新增 generateCode、countTagRefs、cleanOrphanRefs |
| `app/api/tags/route.ts` | POST 中调用 generateCode |
| `app/pages/books/components/tag-library/index.tsx` | SplitPanel + antd Tree + 搜索 + 缓存 |
| `app/pages/books/components/tag-library/index.module.css` | 适配 SplitPanel + 搜索框样式 |
| `shared/ui/tag-selector/index.tsx` | import 迁移 + 接入 useTagTree |
| `app/pages/books/components/settings-library/index.tsx` | tagNameMap 改用 useTagTree |

### 删除（1 个）

| 文件 | 原因 |
|------|------|
| `app/pages/books/api/tags.ts` | 迁移至 app/api-client/tags.ts |

---

## 六、实施步骤（6 Phase）

### Phase 1 — 架构修正（无 UI 变化）

**目标**：修正依赖方向，建立全局缓存

| 步骤 | 任务 | 验证 |
|------|------|------|
| 1.1 | 创建 `app/api-client/tags.ts`，迁移 API 函数 | tsc 零错误 |
| 1.2 | 创建 `app/api-client/index.ts` 导出 tags | import 路径正确 |
| 1.3 | 创建 `app/hooks/use-tag-tree.ts` | Hook 类型正确 |
| 1.4 | 更新 tag-selector import 路径 | 无 pages/ 引用 |
| 1.5 | 更新 tag-library import 路径 | 无 pages/ 引用 |
| 1.6 | 更新 settings-library import 路用 | 无 pages/ 引用 |
| 1.7 | 删除 `app/pages/books/api/tags.ts` | 无残留引用 |
| 1.8 | `npx tsc --noEmit` + `npx eslint .` | 零错误 |

### Phase 2 — 后端增强

**目标**：编码自动生成、删除级联清理、引用计数

| 步骤 | 任务 | 验证 |
|------|------|------|
| 2.1 | tag-store 新增 `generateCode(name)` 函数 | 单元逻辑正确 |
| 2.2 | tag-store `createTagCategory` 调用 generateCode | code 字段自动填充 |
| 2.3 | tag-store 新增 `countTagRefs(bookId, tagId)` | 返回引用数量 |
| 2.4 | tag-store 新增 `cleanOrphanRefs(bookId, deletedIds[])` | 清理孤立引用 |
| 2.5 | tag-store `deleteTagCategory` 内联级联清理 | 删除后无孤立 ID |
| 2.6 | 新建 `app/api/tags/[id]/refs/route.ts` | 返回 { count } |
| 2.7 | 更新 `app/api/tags/[id]/route.ts` delete 调用清理 | 删除流程完整 |
| 2.8 | `npx tsc --noEmit` | 零错误 |

### Phase 3 — TagLibrary 组件重构

**目标**：SplitPanel + antd Tree + 搜索 + 编码展示

| 步骤 | 任务 | 验证 |
|------|------|------|
| 3.1 | 接入 SplitPanel 替代手写分栏 | 布局一致 |
| 3.2 | 手写树 → antd Tree 组件 | 展开/收起正常 |
| 3.3 | 左侧边栏增加搜索框 | 实时过滤 |
| 3.4 | 搜索逻辑：名称/编码匹配 + 祖先展开 | 匹配准确 |
| 3.5 | 编辑表单增加编码只读展示 | 自动显示 |
| 3.6 | 接入 useTagTree 缓存 | 请求次数 ≤ 1 |
| 3.7 | 删除确认增加引用计数提示 | 提示准确 |
| 3.8 | 编辑按钮默认半透明 | 触摸友好 |
| 3.9 | 树展开状态持久化 localStorage | 刷新后恢复 |
| 3.10 | CSS 适配 SplitPanel 布局 | 样式正确 |
| 3.11 | `npx tsc --noEmit` + `npx eslint .` | 零错误 |

### Phase 4 — TagSelector 优化

**目标**：消除反向依赖，接入全局缓存

| 步骤 | 任务 | 验证 |
|------|------|------|
| 4.1 | import 迁移至 app/api-client/tags | 无 pages/ 引用 |
| 4.2 | 接入 useTagTree 替代独立请求 | 共享缓存 |
| 4.3 | `npx tsc --noEmit` | 零错误 |

### Phase 5 — SettingsLibrary 清理

**目标**：移除冗余的标签加载逻辑

| 步骤 | 任务 | 验证 |
|------|------|------|
| 5.1 | tagNameMap 改用 useTagTree | 标签名正确显示 |
| 5.2 | 移除 loadTagMap + 独立 useEffect | 代码精简 |
| 5.3 | `npx tsc --noEmit` | 零错误 |

### Phase 6 — 全量验证

**目标**：确保所有功能正确、无遗漏

| 步骤 | 任务 | 验证 |
|------|------|------|
| 6.1 | `npm run typecheck` | 零错误 |
| 6.2 | `npm run lint` | 零错误 |
| 6.3 | `npm run build` | 构建成功 |
| 6.4 | 功能走查：创建标签 → code 自动生成 | 正确 |
| 6.5 | 功能走查：搜索过滤 → 匹配准确 | 正确 |
| 6.6 | 功能走查：删除标签 → 关联清理 | 无孤立 ID |
| 6.7 | 功能走查：TagSelector 选择 → 设定保存 | 正确 |
| 6.8 | 功能走查：删除有引用的标签 → 提示计数 | 正确 |
| 6.9 | 依赖方向检查：grep "pages/books/api/tags" | 零结果 |
| 6.10 | SQL 注入检查：grep 代码库无字符串拼接 SQL | 零结果 |

---

## 七、验收标准

| 验收项 | 标准 | 优先级 |
|--------|------|--------|
| 编码自动生成 | 创建标签时 code 由系统根据名称自动生成，UI 展示为只读 | P0 |
| 标签搜索 | 输入关键词后 300ms 内过滤，匹配节点及祖先正确展开 | P0 |
| 删除级联 | 删除标签后 setting_entities 中不再有该标签的孤立 ID | P0 |
| SplitPanel | TagLibrary 使用 shared/ui/split-panel | P1 |
| 删除提示 | 正在被使用的标签，删除前提示引用数量 | P1 |
| 全局缓存 | 同一页面内多组件共享同一份标签树数据 | P1 |
| import 无反向依赖 | shared/ui/tag-selector 不引用 app/pages/ | P0 |
| TypeScript | `npm run typecheck` 零错误 | P0 |
| ESLint | `npm run lint` 零错误 | P0 |
| Build | `npm run build` 成功 | P0 |

---

## 八、规范引用

| 规范 | 引用条款 |
|------|----------|
| AGENTS.md | 四层架构、依赖方向、SplitPanel 强制、命名规范 |
| frontend/architecture.md | 依赖方向（不可违反）、组件放置规则 |
| frontend/api.md | 漏斗式错误处理、Result\<T\>、Hook 层规则 |
| frontend/coding.md | TypeScript strict、CSS Modules、命名 |
| frontend/components.md | 按钮规则、BaseModal 用法 |
| backend/database.md | SQL 参数化、store 编码规则 |
| backend/request.md | RESTful 风格、响应格式 |
| backend/coding.md | API Route 编码、参数化查询 |
| management/workflow.md | Git 分支、Commit 规范、PR 流程 |
