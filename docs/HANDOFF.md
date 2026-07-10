# 项目交接文档 — AI Writer (novel-writer)

> 最后更新：2026-07-10 | 当前分支：`master`（稳定分支）
> 仓库：https://github.com/xkhanhan/ai-writer.git

---

## 一、项目概览

AI 辅助小说创作工具，基于 Next.js 16 + React 19 + Ant Design v6 + SQLite（better-sqlite3）。支持从大纲→卷纲→章纲→正文→存稿的全流程创作，附带世界规则、设定库、标签库、AI 配置等辅助系统。

**技术栈核心参数：**

| 项 | 值 |
|-----|-----|
| Next.js | 16.2.10 (Turbopack) |
| React | 19.2.0 |
| Ant Design | 6.5.0 |
| TypeScript | 5.5.3 (strict) |
| 数据库 | SQLite via better-sqlite3 |
| 路径别名 | `@/*` → `./*` |
| 验证命令 | `npm run typecheck` + `npm run lint` + `npm run build` |

---

## 二、架构体系（四层）

严格遵循 AGENTS.md，依赖方向不可违反：

```
app/  →  server/  →  shared/
  ↓         ↑
  └─────────┘  （app 可引用 shared；server 仅被 app/api 引用）
```

| 层 | 职责 | 关键目录 |
|----|------|----------|
| **app/** | Next.js 入口、页面、API 路由、hooks | `app/pages/`、`app/api/`、`app/hooks/`、`app/api-client/` |
| **shared/** | 跨功能复用的 UI 组件和 AI 契约 | `shared/ui/`（base-modal, panel-container, confirm-delete, save-button, tag-tree, tag-selector, empty-state, ai-dropdown, ai-scene-modal, array-input, theme） |
| **server/** | 服务端逻辑，禁止被客户端导入 | `server/storage/`（db, book-store, tag-store 等）、`server/ai/` |
| **data/** | 运行时数据 | `data/novel-writer.db`、`data/book-options.json` |

**文档体系：** `docs/README.md` 为入口，含规范 13 篇、设计文档 7 篇、实施计划 5 份、HTML 视觉原型 10 份。

---

## 三、数据库表结构（11 张表）

| 表 | 用途 | 关键字段 |
|----|------|----------|
| `books` | 书籍 | id, title, genre, platform, targetWordCount, targetTotalWords |
| `book_options` | 键值配置 | key, value (JSON) |
| `folders` | 资料文件夹 | id, book_id, category |
| `files` | 资料文件 | id, folder_id, content |
| `volumes` | 卷纲 | id, book_id, stages (JSON), coreConflict |
| `chapters` | 章纲 | id, volume_id, content, status (planned/writing/done) |
| `book_outlines` | 总纲 | book_id (PK), direction, stages |
| `world_rules` | 世界规则 | id, book_id, category (global/writing/setting), settingType (text/select/number) |
| `archived_chapters` | 存稿 | id, book_id, chapter_id, content, wordCount |
| `tag_categories` | 标签分类（无限层级） | id, book_id, parent_id, name, code, description, sortOrder |
| `setting_entities` | 设定库实体 | id, book_id, category (character/item/location/faction/other), tag_ids (JSON) |

---

## 四、已完成功能模块

### 4.1 核心框架

- [x] App Shell 布局（topbar + 侧边面板 + 内容区）
- [x] 4 套主题切换（暖纸色/冷灰调/纯白/深色）
- [x] AI 配置管理（provider 切换、API Key、模型选择、温度/上下文）
- [x] 漏斗式错误处理架构：API Client → `Result<T>` → Hook → 页面

### 4.2 书籍管理

- [x] 书籍 CRUD、书籍切换
- [x] 书籍元信息表单（类型/平台/字数目标/写作风格等）
- [x] 书籍选项配置（book_options 键值表 + book-options.json）

### 4.3 创作区

- [x] 总纲编辑（book_outlines）
- [x] 卷纲管理（volumes）— CRUD + 排序 + 核心冲突/发展弧线/关键点
- [x] 章纲管理（chapters）— CRUD + 排序 + 场景/角色/关键事件/伏笔
- [x] 正文写作（content 字段）— 每章目标字数 + 实时字数统计
- [x] 存稿系统（archived_chapters）— 正文库存档/还原

### 4.4 辅助系统

- [x] 世界规则（world_rules）— 三类（global/writing/setting）+ 文本/选择/数值三种值类型
- [x] 设定库（setting_entities）— 五类（character/item/location/faction/other）+ 分类专属字段 + 状态字段 + 重要层级
- [x] 资料库（folders + files）— 文件夹/文件管理
- [x] 伏笔追踪（内嵌于 chapters，status: hidden/revealed）

### 4.5 标签库（最新完成 — 2026-07-07）

- [x] `tag_categories` 表 — 支持无限层级（parent_id 自引用）
- [x] 后端 CRUD API（`/api/tags`、`/api/tags/[id]`、`/api/tags/[id]/refs`）
- [x] `server/storage/tag-store.ts` — 树构建、自动编码生成（generateCode + uniqueCode 同级去重）、删除级联清理 orphan refs、引用计数
- [x] `app/api-client/tags.ts` — 漏斗式 API Client（Result\<T\>）
- [x] `app/hooks/use-tag-tree.ts` — 全局缓存 Hook，同一 bookId 仅请求一次
- [x] `shared/ui/tag-tree/` — 统一树组件，ConfigProvider tokens 对齐 antd 视觉规范（无 `:global(.ant-xxx)` 覆盖）
- [x] `shared/ui/tag-selector/` — 级联标签选择器（antd TreeSelect + 虚拟滚动 + 全局搜索 + 1000+ 性能优化）
- [x] 标签库弹窗 — BaseModal + SplitPanel 左右分栏 + 搜索过滤
- [x] 设定库集成 — 设定创建编辑弹窗中可选择标签（上限 10 个）

---

## 五、关键设计模式

### 5.1 漏斗式错误处理

```
API Client（catch → Result<T>）→ Hook（检查 ok/showError）→ 页面（仅展示）
```

禁止在页面/组件层使用 try/catch。

### 5.2 弹窗规范

- 统一使用 `shared/ui/base-modal/BaseModal`
- 三层布局：title(fixed) / scrollable body(flex:1) / fixed footer(flex-shrink:0)
- footer prop 可选，传 `null` 则隐藏
- 删除操作统一使用 `confirmDelete(action, label, warning?)`

### 5.3 PanelContainer 规范

所有列表+详情页必须使用 `shared/ui/panel-container/`（IDE 式可调整面板系统）。

### 5.4 视觉规范核心约束

- **唯一组件库：** Ant Design v6
- **唯一图标库：** `@ant-design/icons`（Outlined 风格）
- **禁止** `:global(.ant-xxx)` 覆盖 antd 样式，改用 ConfigProvider tokens
- **禁止** 硬编码颜色，必须使用 CSS 变量
- **禁止** 引入非规范色彩（蓝色、紫色等）

---

## 六、当前分支状态

```
* master（稳定分支，所有功能已合入）
```

**开发模式**：单人开发 + AI 协作

- AI 在 `feature/*` 分支上提交代码
- 人通过 `.\scripts\merge-to-master.ps1` 一键合并到 master
- 无需 PR 流程

---

## 七、待办事项与未解决问题

### 高优先级

- [ ] **创作区正文编辑器** — 目前章节 content 为纯文本 textarea，需升级为富文本编辑器
- [ ] **AI 辅助创作集成** — 已有 AI 配置和 API 路由（`/api/ai/chat`），需在创作区中集成

### 中优先级

- [ ] **标签拖拽排序** — 目前 sortOrder 为创建顺序，需支持手动调整
- [ ] **设定库批量操作** — 批量打标签、批量移动分类
- [ ] **书籍元信息扩展** — book-metadata.md 计划中的扩展字段
- [ ] **输入验证统一** — input-validation.md 中的全局验证规范

### 低优先级

- [ ] **树展开状态持久化** — 当前标签库展开状态刷新后丢失
- [ ] **存稿版本管理** — archived_chapters 目前为单版本
- [ ] **多用户支持** — 当前为单用户本地应用

---

## 八、关键文档索引

| 文档 | 路径 | 说明 |
|------|------|------|
| 项目架构 | `AGENTS.md` | 四层架构、分支策略、提交规范、编码风格 |
| 文档索引 | `docs/README.md` | 所有规范文档的结构化目录 |
| 架构规范 | `docs/architecture.md` | 四层架构、依赖方向、数据库规范、合规校验 |
| 编码规范 | `docs/coding.md` | TypeScript/React/CSS/后端编码、验证门禁 |
| API 规范 | `docs/api.md` | 漏斗式错误处理、Result\<T\>、RESTful 约定 |
| 视觉规范 | `docs/visual.md` | Design Token、主题系统、响应式、CSS 约束 |
| 组件规范 | `docs/components.md` | 按钮/表单/弹窗规则、提取、无障碍 |
| 工具规范 | `docs/utils.md` | 消息工具、共享组件/hook/utils 注册表 |
| 工作流规范 | `docs/workflow.md` | Git 分支、提交、PR 规则、数据库迁移 |
| 工程化规范 | `docs/engineering.md` | 模块 Checklist、扩展指南、性能预算、拆分规则 |
| 性能规范 | `docs/performance.md` | 前后端性能优化、渲染优化、缓存、监控 |
| 安全规范 | `docs/security.md` | 输入验证、XSS/SQL注入防护、数据隐私、依赖安全 |
| AI 开发规范 | `docs/ai-development.md` | AI 工具使用、Prompt 工程、代码审查、配置管理 |
| 环境管理规范 | `docs/environments.md` | 环境变量、功能开关、构建一致性、平台差异 |
| 校验与 CI/CD | `docs/validation.md` | CI 流水线、自动化校验、Pre-commit Hook、测试策略 |
| 标签库计划 | `docs/archive/plans/tag-library-refactor.md` | v2.0 完整开发计划（已完成） |
| 标签库视觉稿 | `docs/mockups/tag-library.html` | 标签库整体交互原型 |
| 树组件视觉稿 | `docs/mockups/tag-tree.html` | TagTree 视觉规范 v2 |
| 设定库视觉稿 | `docs/mockups/settings-library-v1.html` | 设定库交互原型 |

---

## 九、关键文件结构

> 文件索引随开发持续变化，请以实际代码为准。以下列出核心目录供快速定位：

| 目录 | 说明 |
|------|------|
| `app/pages/books/components/` | 各功能面板（creation-zone, world-rules, tag-library, fact-library, settings-library, foreshadow-library, content-library, prompt-library, review-result-panel） |
| `app/pages/books/config/workspace-panels.tsx` | 面板注册配置 |
| `app/api/` | Next.js API 路由（thin adapter） |
| `app/api-client/` | 客户端 API helper（漏斗式 Result\<T\>） |
| `server/storage/` | SQLite CRUD stores |
| `server/ai/` | AI 配置、ContextBuilder、文本生成 |
| `shared/ui/panel-container/` | IDE 式面板容器系统 |
| `shared/ui/base-modal/` | 统一弹窗 |
| `shared/ui/confirm-delete/` | 删除确认 |
| `shared/types/` | 共享类型定义 |

---

## 十、注意事项与技术卡点

### 已解决的技术难点

1. **uniqueCode SQL 参数不匹配（500 错误）** — parentId 为 null 时 SQL 用 `IS NULL`（无 `?`），但 params 数组仍含 null → 分别构建 args 数组
2. **编辑按钮冒泡折叠** — antd Tree 的 onClick 的 stopPropagation 不够，需同时 onMouseDown 的 stopPropagation + preventDefault
3. **shared/ui 反向引用** — tag-selector 引用 pages/books/api → 迁移至 app/api-client/tags.ts
4. **ESLint setState in useEffect** — 改用 useMemo 计算搜索展开键 + lazy initializer useState

### 已知风险

1. **ConfigProvider token 兼容性** — 部分 token 名称可能在 antd 版本升级后变更（如 `colorBgTreeNodeSelected`）
2. **CSS 变量在 ConfigProvider 中的使用** — antd 内部部分 token 不支持 CSS 变量引用（如 `controlHeightSM`），需要硬编码数值或通过主题覆盖
3. **标签树性能** — 当前实现为全量渲染（无虚拟滚动），超大规模标签（1000+节点同时展开）可能有性能问题
