# 系统架构 V2 — 现状与演进

> 最后更新：2026-07-09
> 状态：基于代码现状重写

---

## 一、设计原则

| 原则 | 说明 |
|------|------|
| **基于现状** | 文档描述代码实际状态，不是理想态 |
| **渐进式** | 每个阶段可独立交付，不依赖后续阶段 |
| **最小验证** | 优先让核心流程跑通，再补全辅助功能 |
| **数据先行** | 新功能先有后端存储，再做前端展示 |

---

## 二、现状全景

### 2.1 技术栈

| 项 | 值 |
|----|-----|
| 框架 | Next.js 16 (Turbopack) + React 19 |
| UI | Ant Design v6 + CSS Modules |
| 数据库 | SQLite via better-sqlite3 |
| 路径别名 | `@/*` → `./*` |
| 验证 | `npm run typecheck` + `npm run lint` + `npm run build` |

### 2.2 四层架构

```
app/       → Next.js 页面、API 路由、hooks、客户端类型
server/    → 数据库访问、AI provider、服务端工具（禁止客户端导入）
shared/    → 跨功能复用的 UI 组件、类型、hooks、AI 契约（最底层）
data/      → 运行时数据（SQLite、JSON，不提交 Git）
```

依赖方向：`app → server`（仅通过 `app/api/`），`app → shared`，`server → shared`，`server → data`。`shared/` 不依赖任何上层。

### 2.3 数据库表（10 张）

```
books ─────────────┬──────────────────────┬──────────────────┐
│                   │                      │                  │
├─ book_outlines    ├─ volumes ─── chapters ├─ world_rules     │
│  (1:1 per book)   │                      │  (global/writing/ │
│                   ├─ folders ─── files    │   setting)        │
├─ archived_chapters│                      │                  │
├─ tag_categories   ├─ setting_entities    │                  │
│  (tree)           │  (character/item/    │                  │
│                   │   location/faction/  │                  │
│                   │   other)             │                  │
└─ book_options     └─────────────────────┘──────────────────┘
    (key-value)
```

**注意：没有 AI 相关表。** AI 配置存储在 `data/ai-config.json` 文件中。

### 2.4 已完成功能

| 模块 | 状态 | 说明 |
|------|------|------|
| App Shell + 主题 | ✅ 完成 | 4 套主题切换，布局框架 |
| 书籍管理 | ✅ 完成 | CRUD、元信息表单、选项配置 |
| 总纲编辑 | ✅ 完成 | direction / stages / sellingPoints |
| 卷纲管理 | ✅ 完成 | CRUD + 排序 + stages + coreConflict |
| 章纲管理 | ✅ 完成 | CRUD + scenes/characters/keyEvents/foreshadowings + 状态流转 |
| 正文编辑 | ⚠️ 基础版 | textarea + 字数统计，无富文本 |
| 正文库存稿 | ✅ 完成 | archived_chapters 展示 + 保存 |
| 世界规则 | ✅ 完成 | 三分类 + text/select/number 三种值类型 |
| 设定库 | ✅ 完成 | 五分类 + statusFields + 标签关联 |
| 标签库 | ✅ 完成 | 无限层级树 + 选择器 + 引用计数 |
| 资料库 | ✅ 完成 | 文件夹/文件管理 |
| AI 配置 | ✅ 完成 | 15 个厂商 + 连接测试 + 模型拉取 |
| AI 文本生成 | ⚠️ 基础版 | `/api/ai/chat` 可调用，但无上下文组装 |
| AI 功能按钮 | ❌ Placeholder | 正文编辑器 4 个按钮只弹提示框 |

### 2.5 已有 AI 基础设施

```
server/ai/
├── ai-config-store.ts      ← 配置读写（JSON 文件）
└── generate-ai-text.ts     ← OpenAI 格式调用（30s 超时）

shared/ai/
├── config-contracts.ts     ← 配置类型 + 默认值
├── contracts.ts            ← AiTextTaskInput/Output 类型
└── providers.ts            ← 15 个预定义厂商

app/api/ai/
├── config/route.ts         ← GET/POST 配置
├── chat/route.ts           ← POST 文本生成
├── models/route.ts         ← POST 模型列表
└── test/route.ts           ← POST 连接测试
```

---

## 三、目标状态

### 3.1 系统模块规划（七大系统）

```
                    ┌─────────────────┐
                    │    提示词系统     │ ← 管理 AI 功能的 prompt 模板
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ 世界规则库 │  │  设定库   │  │  事实库   │
        └────┬─────┘  └────┬─────┘  └────┬─────┘
             │              │              │
             └──────┬───────┘              │
                    ▼                      │
              ┌──────────┐                 │
              │  创作台   │◄────────────────┘
              │ 总纲→卷纲 │
              │ →章纲→正文│
              └────┬─────┘
                   │ 过审
                   ▼
              ┌──────────┐    ┌──────────┐
              │ 伏笔库    │    │  正文库   │
              └──────────┘    └──────────┘
```

### 3.2 现有模块 → 目标模块映射

| 目标系统 | 现有基础 | 缺口 |
|---------|---------|------|
| 世界规则库 | `world_rules` 表 + CRUD ✅ | 已完整 |
| 设定库 | `setting_entities` 表 + CRUD ✅ | V2 要求的状态信息字段更丰富 |
| 标签库 | `tag_categories` 表 + CRUD ✅ | 已完整 |
| 创作台 | 总纲/卷纲/章纲/正文 CRUD ✅ | 缺少 V2 的字段（伏笔操作、开头结尾固定等） |
| 正文库 | `archived_chapters` 表 ✅ | 需升级为内容版本历史 |
| 伏笔库 | 内嵌于 chapters.foreshadowings | 需独立为表 |
| 事实库 | ❌ 不存在 | 需新建 |
| 提示词系统 | ❌ 不存在 | 需新建 |

---

## 四、演进路线

### Phase 0：AI 可用（当前最高优先级）

> 目标：让 AI 在现有创作流程中真正跑起来

- [ ] 新建 `prompt_templates` 表 — 存储 AI 功能的 prompt 模板
- [ ] 新建 `ai_generation_sessions` 表 — 记录 AI 调用历史
- [ ] 实现上下文组装 — 从数据库加载章纲+规则+设定，格式化为 prompt 可用的文本
- [ ] 接通正文生成 — ContentEditor 的"生成内容"按钮真正调 AI
- [ ] 接通文本操作 — 去 AI 味 / 润色 / 扩写
- [ ] 生成结果展示 UI — 加载态 + 结果预览 + 采纳/放弃

详细方案见 [ai-integration.md](./ai-integration.md)。

### Phase 1：设定库 V2 + 伏笔独立

> 目标：设定库支持更丰富的信息结构，伏笔从内嵌变为独立系统

- [ ] 设定库字段增强（statusFields 按分类定义固定字段）
- [ ] 伏笔独立为 `foreshadows` 表
- [ ] 标签选择器集成到设定编辑弹窗

### Phase 2：创作台 V2

> 目标：创作台字段与架构 V2 对齐

- [ ] 卷纲增加 stages（阶段规划）、双向绑定
- [ ] 章纲增加实体关联（引用设定库 ID）、伏笔操作（埋下/回收）、开头结尾固定
- [ ] 卷创建锁定（前卷完结才能创建新卷）

### Phase 3：事实库 + 过审流程

> 目标：过审时自动提取事实、更新状态、记录回滚

- [ ] 新建 `story_facts` 表
- [ ] 过审流程：事实提取 → 设定状态变更 → 伏笔处理 → 规则检查 → 快照 → 存档
- [ ] 章节回退（快照还原）

### Phase 4：内容版本历史

> 目标：替代 archived_chapters，支持版本链和回退

- [ ] 新建 `content_versions` 表
- [ ] 保存/生成/编辑时自动创建版本
- [ ] 版本对比 + 恢复 UI

### Phase 5：知识图谱 + 一致性检查

> 目标：AI 自动维护实体索引，支持跨章一致性检查

- [ ] 新建 `kg_entities` + `kg_relations` 索引表
- [ ] KG 索引器（post-save hook 自动维护）
- [ ] 一致性检查 AI 适配器

---

## 五、数据库演进计划

### 新增表（按 Phase 排列）

**Phase 0（AI 基础）：**
- `prompt_templates` — AI 功能的 prompt 模板
- `ai_generation_sessions` — AI 调用历史记录

**Phase 1：**
- `foreshadows` — 独立伏笔表

**Phase 3：**
- `story_facts` — 事实库

**Phase 4：**
- `content_versions` — 内容版本历史（替代 archived_chapters）

**Phase 5：**
- `kg_entities` — 知识图谱实体索引
- `kg_relations` — 知识图谱关系索引

### 表总数演进

```
当前：10 张表
Phase 0：12 张（+2）
Phase 1：13 张（+1）
Phase 3：14 张（+1）
Phase 4：15 张（+1）
Phase 5：17 张（+2）
```

---

## 六、架构约束（不变）

- 四层依赖方向严格单向
- API 路由是薄适配器，不含业务逻辑
- 漏斗式错误处理：API Client → Result\<T\> → Hook → showError()
- 数据库查询必须参数化
- 所有外键使用 ON DELETE CASCADE
- 时间戳统一 `datetime('now')`
- CSS 变量，禁止硬编码颜色
- 组件库仅 Ant Design v6
