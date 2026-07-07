# 项目交接文档 — AI Writer (novel-writer)

> 最后更新：2026-07-07 | 当前分支：`featuer`（待合回 master）
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
| **shared/** | 跨功能复用的 UI 组件和 AI 契约 | `shared/ui/`（base-modal, split-panel, confirm-delete, save-button, tag-tree, tag-selector, empty-state, ai-dropdown, array-input, theme） |
| **server/** | 服务端逻辑，禁止被客户端导入 | `server/storage/`（db, book-store, tag-store 等）、`server/ai/` |
| **data/** | 运行时数据 | `data/novel-writer.db`、`data/book-options.json` |

**文档体系：** `docs/README.md` 为入口，含前端规范 7 篇、后端规范 4 篇、管理规范 4 篇、设计文档 8 篇。

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

### 5.3 SplitPanel 规范

所有列表+详情页必须使用 `shared/ui/split-panel/SplitPanel`。

### 5.4 视觉规范核心约束

- **唯一组件库：** Ant Design v6
- **唯一图标库：** `@ant-design/icons`（Outlined 风格）
- **禁止** `:global(.ant-xxx)` 覆盖 antd 样式，改用 ConfigProvider tokens
- **禁止** 硬编码颜色，必须使用 CSS 变量
- **禁止** 引入非规范色彩（蓝色、紫色等）

---

## 六、当前分支状态

```
* featuer（本地功能分支，包含所有上述开发）
  master（远程 origin/master，最后一次合入 PR #4）
```

**featuer 分支最近提交（从新到旧）：**

1. `bcf876d` feat(tag-library): 标签库全栈重构 — 树组件视觉对齐antd规范
2. `cc38d2c` docs: 规范文档体系重构 — 三大模块分类归档
3. `d704645` refactor(standards): 按钮功能全面规范化 — 漏斗架构改造
4. `bb5073c` feat(settings-library): 全栈实现设定库系统
5. `7d89bf1` feat(world-rules): 全栈实现世界规则系统
6. `85f2454` feat(input): 标签10字限制+showCount计数器

**待执行：** featuer 分支需通过 PR 合回 master，合并前需确保 typecheck + lint + build 通过。

---

## 七、待办事项与未解决问题

### 高优先级

- [ ] **featuer 分支合回 master** — 所有功能已验证通过，需创建 PR 合并
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
| 视觉规范 | `docs/frontend/visual.md` | Design Token、技术栈约束 |
| 组件规范 | `docs/frontend/components.md` | 按钮/表单/弹窗交互规则 |
| API 规范 | `docs/frontend/api.md` | 漏斗式错误处理、API Client |
| 架构规范 | `docs/frontend/architecture.md` | 三层架构、依赖方向 |
| 标签库计划 | `docs/plans/tag-library-refactor.md` | v2.0 完整开发计划 |
| 标签库视觉稿 | `docs/mocks/tag-library.html` | 标签库整体交互原型 |
| 树组件视觉稿 | `docs/mocks/tag-tree.html` | TagTree 视觉规范 v2 |
| 设定库视觉稿 | `docs/mockups/settings-library-v1.html` | 设定库交互原型 |

---

## 九、核心文件索引

### 新增文件（最近一轮开发）

| 文件 | 说明 |
|------|------|
| `app/api-client/tags.ts` | 标签 API Client（漏斗式） |
| `app/api/tags/route.ts` | GET(树) / POST |
| `app/api/tags/[id]/route.ts` | GET / PUT / DELETE |
| `app/api/tags/[id]/refs/route.ts` | GET 引用计数 |
| `app/hooks/use-tag-tree.ts` | 标签树全局缓存 Hook |
| `server/storage/tag-store.ts` | 标签 CRUD + 树构建 + 编码生成 |
| `shared/ui/tag-tree/index.tsx` | 统一标签树组件（ConfigProvider tokens） |
| `shared/ui/tag-tree/index.module.css` | 树组件样式（纯 CSS Modules，无 antd 覆盖） |
| `shared/ui/tag-selector/index.tsx` | 级联标签选择器（TreeSelect） |
| `shared/ui/tag-selector/index.module.css` | 选择器样式 |

### 关键修改文件

| 文件 | 变更 |
|------|------|
| `app/types/index.ts` | TagCategory 增加 code/sortOrder + DTO |
| `app/api-client/index.ts` | 导出 tags API |
| `shared/ui/base-modal/index.tsx` | 新增 footer 可选 prop |
| `shared/ui/confirm-delete/index.tsx` | 新增 warning 参数 |
| `server/storage/db.ts` | tag_categories + setting_entities 表定义 |
| `app/pages/books/components/tag-library/` | 标签库主组件（BaseModal 弹窗 + SplitPanel） |
| `app/pages/books/components/settings-library/index.tsx` | tagNameMap 改用 useTagTree |

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
