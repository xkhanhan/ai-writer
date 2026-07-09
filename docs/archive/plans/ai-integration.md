# AI 集成方案 — 从现状到可用

> 最后更新：2026-07-09
> 状态：基于现有代码重写，可直接指导开发

---

## 一、目标

让 AI 在创作流程中**真正可用**：用户在正文编辑器点击"生成内容"，AI 根据章纲信息+世界规则+设定生成正文；点击"润色"/"扩写"/"去AI味"，AI 对选中文本进行处理。

**不做**：多模型路由、KG 索引、知识图谱、插件系统。这些留给后续 Phase。

---

## 二、现有基础

### 已通的链路

```
用户 → AI 设置页 → 配置厂商/API Key/模型 → 保存到 data/ai-config.json
                                                    ↓
                                              server/ai/
                                              ai-config-store.ts
                                              generate-ai-text.ts
                                                    ↓
                                              POST /api/ai/chat
                                              { prompt, systemPrompt, temperature, model }
                                                    ↓
                                              OpenAI 兼容格式调用
                                              → 返回 { content: string }
```

**这条链路已经能用。** 只要用户配好了 API Key，`/api/ai/chat` 就能返回 AI 生成的文本。

### 缺什么

| 缺口 | 说明 |
|------|------|
| **上下文组装** | `/api/ai/chat` 只接收裸 prompt，没有从数据库加载章纲/规则/设定 |
| **Prompt 模板** | 没有地方存储和管理 AI 功能的 prompt 模板 |
| **生成历史** | 没有记录每次 AI 调用的输入输出 |
| **结果 UI** | ContentEditor 的 AI 按钮只弹 `message.info` |

### 类型冗余（需清理）

- `AiConfig`（app/types）vs `PublicAiConfig`（shared/ai/config-contracts）— 同一个概念两个定义
- `AiTextTaskInput`（shared/ai/contracts）vs `/api/ai/chat` 的 body 类型 — 不一致

---

## 三、架构设计

### 3.1 总体思路

**不建四层架构**。在现有代码结构上做最小扩展：

```
app/api/ai/chat/route.ts     ← 现有，扩展参数
server/ai/
├── ai-config-store.ts       ← 现有，不动
├── generate-ai-text.ts      ← 现有，不动
├── prompt-store.ts           ← 新增：prompt 模板 CRUD
├── context-builder.ts        ← 新增：从数据库组装上下文
└── generation-store.ts       ← 新增：生成历史 CRUD
server/storage/
├── db.ts                     ← 修改：新增 2 张表
├── prompt-template-store.ts  ← 新增：prompt_templates 表操作
└── generation-store.ts       ← 新增：ai_generation_sessions 表操作
app/api/ai/
├── chat/route.ts             ← 修改：支持上下文组装参数
├── templates/route.ts        ← 新增：prompt 模板管理 API
└── sessions/route.ts         ← 新增：生成历史查询 API
app/pages/books/components/creation-zone/
├── components/content-editor/ ← 修改：AI 按钮真正调 AI
└── components/ai-result-panel/ ← 新增：AI 结果展示组件
```

### 3.2 数据库新增

#### `prompt_templates` 表

```sql
CREATE TABLE IF NOT EXISTS prompt_templates (
  id            TEXT PRIMARY KEY,
  book_id       TEXT NOT NULL,            -- 所属书籍
  function_key  TEXT NOT NULL,            -- 功能标识：'content_generate' | 'deslop' | 'polish' | 'expand'
  display_name  TEXT NOT NULL,            -- 显示名称
  description   TEXT DEFAULT '',
  template      TEXT NOT NULL,            -- prompt 模板（含 $变量）
  variables     TEXT DEFAULT '[]',        -- JSON: 可用变量列表
  is_default    INTEGER DEFAULT 0,        -- 是否系统默认（不可删除）
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_prompt_func ON prompt_templates(book_id, function_key);
```

#### `ai_generation_sessions` 表

```sql
CREATE TABLE IF NOT EXISTS ai_generation_sessions (
  id              TEXT PRIMARY KEY,
  book_id         TEXT NOT NULL,
  function_key    TEXT NOT NULL,           -- 使用的 AI 功能
  chapter_id      TEXT,                    -- 关联章节（可选）

  -- 输入
  input_context   TEXT DEFAULT '',         -- JSON: 发给 AI 的完整上下文摘要
  user_input      TEXT DEFAULT '',         -- 用户输入的补充要求

  -- 输出
  raw_output      TEXT DEFAULT '',         -- AI 原始返回
  adopted         INTEGER DEFAULT 0,       -- 用户是否采纳

  -- 元数据
  model           TEXT DEFAULT '',         -- 使用的模型
  tokens_input    INTEGER DEFAULT 0,
  tokens_output   INTEGER DEFAULT 0,
  latency_ms      INTEGER DEFAULT 0,

  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_gen_sessions_book ON ai_generation_sessions(book_id);
CREATE INDEX IF NOT EXISTS idx_gen_sessions_chapter ON ai_generation_sessions(chapter_id);
```

### 3.3 上下文组装（ContextBuilder）

**职责**：根据 AI 功能类型，从数据库加载相关数据，格式化为 prompt 文本。

```typescript
// server/ai/context-builder.ts

interface ContextInput {
  bookId: string;
  chapterId?: string;
  functionKey: string;  // 'content_generate' | 'deslop' | 'polish' | 'expand'
}

interface BuiltContext {
  systemPrompt: string;     // 系统提示词
  contextParts: string[];   // 各层上下文，按优先级排列
  totalEstimate: number;    // 估算 token 数
}

/**
 * 根据功能类型组装 AI 上下文
 *
 * content_generate（正文生成）：
 *   书籍元信息 + 总纲方向 + 卷纲（标题+核心冲突+阶段） + 章纲全部字段 + 世界规则（全局+写作）
 *   + 关联设定实体 + 前章末尾
 *
 * deslop（去AI味）：
 *   系统提示词（去AI味指令）+ 选中文本
 *
 * polish（润色）：
 *   系统提示词（润色指令）+ 章纲摘要（可选）+ 选中文本
 *
 * expand（扩写）：
 *   系统提示词（扩写指令）+ 章纲摘要（可选）+ 前文上下文 + 选中文本
 */
async function buildContext(input: ContextInput): Promise<BuiltContext>;
```

#### 各功能的上下文范围

| 功能 | 需要加载的数据 | 目标 token |
|------|-------------|-----------|
| 正文生成 | 书籍 + 总纲 + 卷纲 + 章纲 + 世界规则 + 关联设定 + 前章末尾 | 2000-4000 |
| 去 AI 味 | 选中文本 | 500-2000 |
| 润色 | 章纲摘要（可选）+ 选中文本 | 500-2000 |
| 扩写 | 章纲摘要 + 前文上下文 + 选中文本 | 1000-3000 |

#### 正文生成的上下文组装逻辑

```
1. 加载书籍元信息
   → books WHERE id = bookId
   → 格式化：书名、题材、写作风格、目标受众

2. 加载总纲
   → book_outlines WHERE book_id = bookId
   → 格式化：整体方向

3. 加载当前卷纲
   → volumes WHERE id = chapter.volumeId
   → 格式化：标题、核心冲突、阶段列表

4. 加载当前章纲
   → chapters WHERE id = chapterId
   → 格式化：标题、摘要、场景、出场人物、重要事件、伏笔、目标字数

5. 加载世界规则
   → world_rules WHERE book_id = bookId AND category IN ('global', 'writing')
   → 格式化：按分类分组

6. 加载关联设定（如有 characters 字段）
   → setting_entities WHERE book_id = bookId AND name IN (章纲中的 characters)
   → 格式化：名称、描述、状态

7. 加载前章末尾（如有）
   → chapters WHERE volume_id = chapter.volumeId AND sort_order < chapter.sortOrder
   → 取前一章的 content 末尾 500 字

8. 组装为完整 prompt
```

### 3.4 默认 Prompt 模板

首次使用时在数据库中预置以下模板：

#### 正文生成

```
你是一位资深网络小说作家。请根据以下章纲信息撰写正文。

## 书籍信息
书名：$bookTitle
题材：$bookGenre
写作风格：$bookStyle

## 整体方向
$outlineDirection

## 本卷信息
标题：$volumeTitle
核心冲突：$volumeConflict

## 本章信息
标题：$chapterTitle
摘要：$chapterSummary
场景：$chapterScenes
出场人物：$chapterCharacters
重要事件：$chapterKeyEvents
伏笔：$chapterForeshadows
目标字数：$expectedWords 字

## 世界规则
$globalRules

## 写作规则
$writingRules

## 关联设定
$relatedSettings

## 前文衔接
$previousEnding

## 要求
- 严格按照章纲的场景和事件展开
- 人物言行符合设定
- 遵守所有世界规则和写作规则
- 目标字数：$expectedWords 字
```

#### 去 AI 味

```
你是一位经验丰富的网文编辑。请对以下文本进行"去AI味"处理：
- 删除明显的AI写作痕迹（如"值得注意的是""让我们来看看"等）
- 让语言更口语化、更自然
- 保持原文的情节和信息不变
- 保持原文的字数大致不变（±10%）

## 原文
$text
```

#### 润色

```
你是一位资深网文编辑。请对以下文本进行润色：
- 提升文字的表现力和感染力
- 优化句式结构，让阅读更流畅
- 保持原文风格和情节不变
- 保持字数大致不变

## 背景
$chapterContext

## 原文
$text
```

#### 扩写

```
你是一位资深网络小说作家。请对以下片段进行扩写：
- 在保持原有情节的基础上丰富细节
- 增加环境描写、心理活动、对话等
- 保持原文风格一致
- 扩写到约 $targetWords 字

## 背景
$chapterContext

## 原文片段
$text
```

### 3.5 前端结果展示

```
┌──────────────────────────────────────────┐
│  AI 生成中...  ████████░░░░  70%         │
├──────────────────────────────────────────┤
│                                          │
│  [生成的文本内容]                          │
│                                          │
├──────────────────────────────────────────┤
│  模型: gpt-4o-mini                       │
│  耗时: 8.2s  |  Token: 1200/3500        │
│                                          │
│  [重新生成]  [放弃]  [采纳]               │
└──────────────────────────────────────────┘
```

**采纳行为**：
- 正文生成 → 写入 `chapters.content`，状态变为 `writing`
- 去 AI 味/润色 → 替换选中文本
- 扩写 → 替换选中文本

---

## 四、实施计划

### Step 1：数据库 + Store（后端基础）

**文件变更：**
- `server/storage/db.ts` — 新增 2 张表 + 迁移注册
- `server/storage/prompt-template-store.ts` — 新建，prompt 模板 CRUD
- `server/storage/generation-store.ts` — 新建，生成历史 CRUD
- `server/ai/prompt-store.ts` — 新建，提示词模板管理（加载+渲染+变量替换）

**验证：** `npm run typecheck` 通过

### Step 2：上下文组装（核心逻辑）

**文件变更：**
- `server/ai/context-builder.ts` — 新建，从数据库加载数据并格式化

**依赖的 store 函数：**
- `book-store.ts`: `getBookById`
- `outline-store.ts`: `getBookOutline`, `getVolumeById`, `getChapterById`, 上一章
- `world-rule-store.ts`: `getWorldRulesByBookId`
- `setting-entity-store.ts`: `getSettingEntitiesByBookId`

**验证：** 单元测试（手动调用 `buildContext` 函数，确认输出格式）

### Step 3：API 路由扩展

**文件变更：**
- `app/api/ai/chat/route.ts` — 修改，增加 `contextBuilder` 参数（bookId + chapterId + functionKey），支持自动组装上下文
- `app/api/ai/templates/route.ts` — 新建，GET/PUT prompt 模板
- `app/api/ai/sessions/route.ts` — 新建，GET 生成历史

**验证：** `npm run typecheck` + `npm run lint` 通过

### Step 4：前端结果面板

**文件变更：**
- `app/pages/books/components/creation-zone/components/ai-result-panel/index.tsx` — 新建
- `app/pages/books/components/creation-zone/components/ai-result-panel/index.module.css` — 新建

**组件功能：**
- 接收 `functionKey`, `bookId`, `chapterId`, `onAdopt(content)` 回调
- 调用 `/api/ai/chat`（带上下文参数）
- 展示加载态 → 结果预览 → 重新生成/放弃/采纳
- 记录生成历史

**验证：** 组件渲染正常

### Step 5：接通 ContentEditor AI 按钮

**文件变更：**
- `app/pages/books/components/creation-zone/components/content-editor/index.tsx` — 修改

**变更内容：**
- 4 个 AI 按钮的 onClick 从 `message.info` 改为打开 AiResultPanel
- "生成内容"：传入 `functionKey: 'content_generate'`，采纳时写入 content
- "去 AI 味"/"润色"/"扩写"：传入选中文本，采纳时替换选中部分

**验证：** 手动测试全流程（需配置 AI API Key）

### Step 6：接通 ContentLibrary AI 按钮

**文件变更：**
- `app/pages/books/components/content-library/index.tsx` — 修改

**变更内容：**
- 3 个 AI 按钮接通（去 AI 味/全文润色/扩写）

**验证：** 手动测试

---

## 五、文件清单汇总

### 新建文件

| 文件 | 职责 |
|------|------|
| `server/storage/prompt-template-store.ts` | prompt_templates 表 CRUD |
| `server/storage/generation-store.ts` | ai_generation_sessions 表 CRUD |
| `server/ai/context-builder.ts` | 上下文组装 |
| `server/ai/prompt-store.ts` | 提示词模板加载+渲染 |
| `app/api/ai/templates/route.ts` | 模板管理 API |
| `app/api/ai/sessions/route.ts` | 生成历史 API |
| `app/pages/books/components/creation-zone/components/ai-result-panel/index.tsx` | AI 结果展示组件 |
| `app/pages/books/components/creation-zone/components/ai-result-panel/index.module.css` | 结果面板样式 |

### 修改文件

| 文件 | 变更 |
|------|------|
| `server/storage/db.ts` | 新增 2 张表定义 |
| `app/api/ai/chat/route.ts` | 支持上下文组装参数 |
| `app/pages/books/components/creation-zone/components/content-editor/index.tsx` | AI 按钮接通 |
| `app/pages/books/components/content-library/index.tsx` | AI 按钮接通 |
| `shared/types/index.ts` | 新增 AI 相关类型 |

---

## 六、后续演进（Phase 1+）

完成 Phase 0 后，AI 功能基础已就绪。后续按 [architecture-v2.md](./architecture-v2.md) 的 Phase 1-5 推进：

- Phase 1：设定库 V2 + 伏笔独立 → AI 可读取更丰富的设定数据
- Phase 2：创作台 V2 → AI 上下文更完整（实体关联、伏笔操作）
- Phase 3：事实库 + 过审 → AI 参与事实提取和一致性检查
- Phase 4：内容版本历史 → AI 生成的每个版本可追溯
- Phase 5：知识图谱 → AI 可查询跨章实体关系

每一阶段都建立在 Phase 0 的 AI 基础之上，不需要重写 AI 层。
