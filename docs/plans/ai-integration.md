# AI 集成架构 V2 — 技术规范

> 版本：2.1
> 最后更新：2026-07-09
> 状态：设计完成，待实施

---

## 一、设计原则

| 原则 | 说明 | 不可违反 |
|------|------|---------|
| **分层隔离** | 四层架构，层间通过接口通信，禁止跨层直接调用 | 是 |
| **数据单向** | 程序数据 → AI（单向），AI 不回写程序数据，用户确认后才写入 | 是 |
| **知识驱动** | AI 上下文来自 Writing Context + ContextQuery，不来自模板硬编码 | 是 |
| **适配器可扩展** | 新增 AI 功能只需注册适配器，不改核心代码 | 是 |
| **模型按需路由** | 不同任务使用不同模型，平衡质量与成本 | 否（v1 可用单一模型） |
| **本地优先** | 数据存储在本地 SQLite，AI 调用是唯一网络依赖 | 是 |

---

## 二、架构全景

```
┌─────────────────────────────────────────────────────────────────┐
│                    应用层 (Application)                           │
│                                                                  │
│  创作区 · 设定库 · 事实库 · 提示词管理 · 统计                     │
│  UI 组件 + React 状态 + 用户交互逻辑                              │
│                                                                  │
│  ══════════════════ 边界：应用层只读写知识层接口 ══════════════════ │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                    适配层 (Adapter)                               │
│                                                                  │
│  Adapter Registry · Stage Adapters · Prompt Builder              │
│  每个适配器 = 上下文需求 + 提示词策略 + 输出格式 + 模型偏好        │
│                                                                  │
│  ══════════════════ 边界：适配层只读知识层，不直接访问数据库 ════ │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                    知识层 (Knowledge)                             │
│                                                                  │
│  Writing Context · ContextQuery · Model Router                   │
│  Generation History · ContextManager · ContentVersion            │
│                                                                  │
│  ══════════════════ 边界：知识层封装所有数据访问 ══════════════════ │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                    基础层 (Foundation)                            │
│                                                                  │
│  SQLite · AI Service (OpenAI-compatible) · 文件系统              │
│                                                                  │
│  ══════════════════ 边界：基础层不包含业务逻辑 ════════════════════ │
└─────────────────────────────────────────────────────────────────┘
```

### 层间通信规则

| 层 | 可以调用 | 禁止调用 |
|----|---------|---------|
| 应用层 | 知识层 API | 直接调 AI Service / 直接访问数据库 |
| 适配层 | 知识层 API + 基础层 AI Service | 直接访问数据库 / 直接操作 UI 状态 |
| 知识层 | 基础层（DB / AI Service） | 直接操作 UI 状态 |
| 基础层 | 无上层依赖 | 调用任何上层 |

---

## 三、基础层 (Foundation)

### 3.1 数据库 Schema 新增

在现有表结构基础上，新增以下表：

```sql
-- AI 生成历史
CREATE TABLE IF NOT EXISTS ai_generation_sessions (
  id              TEXT PRIMARY KEY,
  book_id         TEXT NOT NULL,
  adapter_id      TEXT NOT NULL,
  chapter_id      TEXT,                -- 可选关联章节

  -- 输入快照
  input_snapshot  TEXT DEFAULT '',     -- JSON: 传给 AI 的完整上下文摘要
  user_input      TEXT DEFAULT '',     -- 用户输入的想法

  -- 输出
  raw_output      TEXT DEFAULT '',     -- AI 原始返回
  parsed_results  TEXT DEFAULT '[]',   -- JSON: 解析后的结构化结果
  adopted_fields  TEXT DEFAULT '[]',   -- JSON: 用户采纳的字段 key 列表

  -- 元数据
  model           TEXT DEFAULT '',     -- 使用的模型 ID
  tokens_input    INTEGER DEFAULT 0,
  tokens_output   INTEGER DEFAULT 0,
  cost            REAL DEFAULT 0,      -- 估算花费（元）
  latency_ms      INTEGER DEFAULT 0,   -- 响应时间

  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_book    ON ai_generation_sessions(book_id);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_adapter ON ai_generation_sessions(book_id, adapter_id);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_chapter ON ai_generation_sessions(chapter_id);

-- 提示词模板
CREATE TABLE IF NOT EXISTS prompt_templates (
  id            TEXT PRIMARY KEY,
  function_key  TEXT NOT NULL,         -- 对应 adapter ID
  display_name  TEXT NOT NULL,
  description   TEXT DEFAULT '',
  template      TEXT NOT NULL,         -- 含 $变量 的模板文本
  variables     TEXT DEFAULT '[]',     -- JSON: 可用变量列表
  is_default    INTEGER DEFAULT 0,     -- 是否系统默认
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_func ON prompt_templates(function_key);

-- 内容版本历史
CREATE TABLE IF NOT EXISTS content_versions (
  id              TEXT PRIMARY KEY,
  entity_type     TEXT NOT NULL,         -- 'chapter' | 'book_outline' | 'volume_outline' | 'chapter_outline'
  entity_id       TEXT NOT NULL,         -- 对应实体的 ID
  version         INTEGER NOT NULL,      -- 版本号（递增）
  content         TEXT NOT NULL,         -- 该版本的完整内容快照
  content_delta   TEXT DEFAULT '',       -- JSON: 与上一版本的差异（可选，用于压缩旧版本）
  source          TEXT NOT NULL,         -- 'manual' | 'ai_generate' | 'ai_edit'
  ai_session_id   TEXT,                  -- 如果来源是 AI，关联到 ai_generation_sessions
  created_at      INTEGER NOT NULL,
  created_by      TEXT DEFAULT 'user',   -- 'user' | 'ai'

  UNIQUE(entity_type, entity_id, version)
);
CREATE INDEX IF NOT EXISTS idx_cv_entity ON content_versions(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_cv_session ON content_versions(ai_session_id);

-- 故事知识图谱 — 索引表（由系统自动维护，非用户手动创建）
CREATE TABLE IF NOT EXISTS kg_entities (
  id            TEXT PRIMARY KEY,
  book_id       TEXT NOT NULL,
  entity_type   TEXT NOT NULL,         -- 'character' | 'location' | 'faction' | 'item' | 'concept'
  ref_type      TEXT NOT NULL,         -- 数据来源表：'setting_entities' | 'story_facts' | 'chapters'
  ref_id        TEXT NOT NULL,         -- 来源表的记录 ID
  name          TEXT NOT NULL,
  description   TEXT DEFAULT '',       -- 当前状态描述
  first_seen    INTEGER DEFAULT 0,     -- 首次出现章节 sort_order
  last_seen     INTEGER DEFAULT 0,     -- 最后出现章节 sort_order
  status        TEXT DEFAULT 'active', -- 'active' | 'dead' | 'missing' | 'retired'
  metadata      TEXT DEFAULT '{}',     -- JSON: 扩展属性
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_kg_entities_book ON kg_entities(book_id);
CREATE INDEX IF NOT EXISTS idx_kg_entities_type ON kg_entities(book_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_kg_entities_ref  ON kg_entities(ref_type, ref_id);
CREATE INDEX IF NOT EXISTS idx_kg_entities_name ON kg_entities(book_id, name);

-- 故事知识图谱 — 关系边（由系统自动维护）
CREATE TABLE IF NOT EXISTS kg_relations (
  id            TEXT PRIMARY KEY,
  book_id       TEXT NOT NULL,
  source_name   TEXT NOT NULL,         -- 源实体名称
  target_name   TEXT NOT NULL,         -- 目标实体名称
  relation_type TEXT NOT NULL,         -- 'ally' | 'enemy' | '师徒' | '伏笔指向' | '因果' | ...
  description   TEXT DEFAULT '',
  chapter_order INTEGER DEFAULT 0,     -- 关系建立/变化的章节
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_kg_rel_source ON kg_relations(book_id, source_name);
CREATE INDEX IF NOT EXISTS idx_kg_rel_target ON kg_relations(book_id, target_name);
CREATE INDEX IF NOT EXISTS idx_kg_rel_book   ON kg_relations(book_id);
```

### 3.2 与现有表的关系

**kg_entities 不替代 setting_entities**。两者职责不同：

| 表 | 职责 | 数据来源 |
|---|---|---|
| `setting_entities` | 业务操作表，存储设定库的结构化数据 | 用户手动维护 |
| `kg_entities` | 索引表，存储叙事层面的实体快照 | 系统从 setting_entities / story_facts / chapters 自动抽取 |
| `kg_relations` | 索引表，存储实体间关系 | 系统从 story_facts.relatedEntities + foreshadows + 章节内容自动构建 |

**kg_* 表的数据生命周期**：

```
用户编辑操作数据（setting_entities / story_facts / foreshadows / chapters）
  ↓ 写入操作表
  ↓
KG 索引器（异步 post-save hook）自动触发
  ↓ 扫描变更内容，提取实体和关系
  ↓
kg_entities / kg_relations 更新（对用户完全透明）
  ↓
ContextQueryService 查询时读取 kg_* 表
```

**archived_chapters 表废弃**：原有功能由 `content_versions` 替代。archived_chapters 只存一个旧版本，content_versions 存完整版本链。

### 3.3 AI Service 封装

```typescript
// server/ai/ai-service.ts

interface AiModelConfig {
  id: string;
  provider: 'openai-compatible';
  baseUrl: string;
  apiKey: string;
  model: string;
  maxTokens: number;
  contextSize: number;      // 模型上下文窗口大小（token 数）
  temperature: number;
  costPer1kInput: number;   // 每 1000 input token 花费（元）
  costPer1kOutput: number;  // 每 1000 output token 花费（元）
  tags: string[];           // 能力标签: 'fast' | 'creative' | 'structured' | 'cheap'
}

interface AiMessage {
  role: 'system' | 'user' | 'assistant' | 'system-summary';
  content: string;
}

interface AiCompletionRequest {
  model?: string;            // 可选覆盖模型
  messages: AiMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  timeout?: number;          // 超时（ms），默认 60000
}

interface AiCompletionResponse {
  content: string;
  model: string;
  tokensInput: number;
  tokensOutput: number;
  latencyMs: number;
}

interface AiService {
  /** 单次调用 */
  complete(request: AiCompletionRequest): Promise<AiCompletionResponse>;

  /** 流式调用 */
  stream(
    request: AiCompletionRequest,
    onChunk: (chunk: string) => void
  ): Promise<AiCompletionResponse>;
}
```

**边界约束**：
- AiService 只负责 HTTP 调用 + 响应解析
- 不负责 prompt 组装（由适配层的 PromptBuilder 负责）
- 不负责上下文管理（由知识层的 ContextManager 负责）
- 不负责结果解析（由适配层负责）
- 超时/重试策略在这一层实现

---

## 四、知识层 (Knowledge)

### 4.1 Writing Context — 分层上下文

**职责**：根据适配器声明的需求，自动从数据库加载数据并格式化为 prompt 可用的文本。

**边界**：
- 只负责「取数据 + 格式化」，不负责 prompt 模板渲染
- 每层独立，层间无依赖
- 支持 `full` 和 `summary` 两种格式（token 紧张时自动降级）

```typescript
// server/knowledge/context-layer.ts

type ContextLayerName =
  | 'book'       // 书籍元信息
  | 'story'      // 总纲
  | 'volume'     // 当前卷 + 已有卷摘要
  | 'chapter'    // 当前章纲
  | 'content'    // 正文（前章末尾 + 当前章）
  | 'settings'   // 关联设定实体
  | 'rules'      // 世界规则
  | 'facts'      // 事实库
  | 'foreshadows'; // 伏笔库

interface LayerLoadContext {
  bookId: string;
  chapterId?: string;
  volumeId?: string;
  entityId?: string;
  /** 跨书引用（系列小说） */
  crossBookId?: string;
}

interface ContextLayer<T = any> {
  /** 层名称 */
  name: ContextLayerName;

  /** 加载原始数据 */
  load(ctx: LayerLoadContext): Promise<T>;

  /** 格式化为 prompt 文本 */
  format(data: T, mode: 'full' | 'summary'): string;

  /** 估算 token 数 */
  estimateTokens(data: T, mode: 'full' | 'summary'): number;
}

interface LayerRegistry {
  register(layer: ContextLayer): void;
  get(name: ContextLayerName): ContextLayer;
  getAll(names: ContextLayerName[]): ContextLayer[];
}
```

#### 各层实现规范

| 层 | 数据来源 | full 模式 | summary 模式 | token 估算 |
|----|---------|-----------|-------------|-----------|
| book | `books` 表 | 所有元信息字段 | 仅 genre/subGenre/writingStyle/targetAudience | ~200 / ~80 |
| story | `book_outlines` 表 | storyCore + protagonist引用 + conflict + ending | storyCore + conflict | ~300 / ~100 |
| volume | `volumes` 表 | 当前卷完整 + 历史卷各 2 行摘要 | 当前卷标题+梗概 + 历史卷各 1 行 | ~500 / ~150 |
| chapter | `chapters` 表 | 当前章纲所有字段 | 标题+梗概+场景列表 | ~400 / ~120 |
| content | `chapters.content` | 前一章末尾 1000 字 | 前一章末尾 300 字 | ~600 / ~200 |
| settings | `setting_entities` 表 | 关联实体完整信息 | 关联实体名称+级别+摘要 | 可变 |
| rules | `world_rules` 表 | 所有适用规则 | 仅 global + writing 规则 | ~400 / ~150 |
| facts | `story_facts` 表 | 最近 50 条事实 | 最近 20 条事实 | ~500 / ~200 |
| foreshadows | `foreshadows` 表 | 所有 hidden 伏笔 | hidden 伏笔名称列表 | ~300 / ~100 |

#### 格式化规范

每层的 `format()` 输出必须遵循统一的 Markdown 格式：

```markdown
## {层标题}

{格式化后的内容}

---
```

**示例 — rules 层 full 模式**：

```markdown
## 世界规则

### 全局规则
1. 本作品不包含政治敏感内容
2. 修仙者不可使用现代科技

### 写作规则
1. 文风平实内敛，避免华丽辞藻
2. 对话不超过全文 30%
```

**示例 — facts 层 summary 模式**：

```markdown
## 近期事实

- [第1章] 主角拜入玄天宗外门
- [第3章] 获得神秘玉佩
- [第5章] 陈长老被杀
- [第8章] 服用聚灵丹突破炼气三层
- ...共 20 条
```

### 4.2 ContextQuery — 统一查询服务

**职责**：提供 AI 上下文所需的结构化查询能力，封装 KG 索引表 + 操作表的联合查询。

**边界**：
- 只负责查询，不负责写入（写入由 KG 索引器异步处理）
- 不对外暴露原始 SQL，通过 ContextQuery 接口访问
- 查询失败时降级为只查操作表，不阻断 AI 调用

```typescript
// server/knowledge/context-query.ts

interface CharacterProfile {
  name: string;
  // 来自 setting_entities 的基础设定
  category: string;
  level: string;
  description: string;
  traits: string;
  abilities: string;
  statusFields: Record<string, string>;
  // 来自 kg_entities 的叙事信息
  firstSeen: number;
  lastSeen: number;
  status: string;
  // 来自 kg_relations 的关系网
  relations: Array<{
    target: string;
    type: string;
    description: string;
    chapterOrder: number;
  }>;
  // 来自 story_facts 的相关事实
  relatedFacts: Array<{
    content: string;
    chapterOrder: number;
  }>;
}

interface EntitySearchResult {
  name: string;
  entityType: string;
  refType: string;
  refId: string;
  status: string;
}

interface ContextQueryService {
  // ── 实体查询 ──

  /** 获取角色/势力/物品的完整画像（跨表联合） */
  getCharacterProfile(bookId: string, name: string): Promise<CharacterProfile | null>;

  /** 搜索实体（模糊匹配） */
  searchEntities(bookId: string, query: string): Promise<EntitySearchResult[]>;

  /** 获取某章节涉及的所有实体 */
  getChapterEntities(bookId: string, chapterOrder: number): Promise<EntitySearchResult[]>;

  // ── 关系查询 ──

  /** 获取某实体的所有关系 */
  getEntityRelations(bookId: string, entityName: string): Promise<KgRelation[]>;

  /** 获取两个实体之间的关系路径 */
  getRelationPath(
    bookId: string,
    sourceName: string,
    targetName: string,
    maxDepth?: number
  ): Promise<KgRelation[]>;

  // ── 一致性查询 ──

  /** 获取所有未回收的伏笔 */
  getOpenForeshadows(bookId: string): Promise<Array<{
    id: string;
    name: string;
    description: string;
    chapterOrder: number;
  }>>;

  /** 获取状态异常的实体（如已死亡但仍活跃） */
  getAnomalies(bookId: string): Promise<Array<{
    entityName: string;
    issue: string;
    severity: 'error' | 'warning';
  }>>;
}
```

#### ContextQuery 内部实现逻辑

ContextQuery 不是独立存储，而是**组合查询层**：

```
getCharacterProfile(bookId, "萧炎")
  │
  ├── 1. 查 setting_entities
  │     WHERE book_id = ? AND name = '萧炎'
  │     → 基础设定（category, level, description, traits, abilities, statusFields）
  │
  ├── 2. 查 kg_entities（索引表）
  │     WHERE book_id = ? AND name = '萧炎'
  │     → 叙事信息（firstSeen, lastSeen, status, metadata）
  │
  ├── 3. 查 kg_relations（索引表）
  │     WHERE book_id = ? AND (source_name = '萧炎' OR target_name = '萧炎')
  │     → 关系网（target, type, description）
  │
  ├── 4. 查 story_facts
  │     WHERE book_id = ? AND relatedEntities LIKE '%萧炎%'
  │     ORDER BY chapter_order DESC LIMIT 20
  │     → 相关事实
  │
  └── 5. 组装 CharacterProfile 返回
```

#### KG 索引器

```typescript
// server/knowledge/kg-indexer.ts

interface KgIndexer {
  /**
   * 从操作表扫描并更新 kg_entities
   * 在以下操作后触发：
   *   - 保存 setting_entities（新增/修改）
   *   - 保存 story_facts（新增/修改）
   *   - 保存 chapters.content（正文写入/修改）
   */
  indexEntities(bookId: string, sourceType: string, sourceId: string): Promise<void>;

  /**
   * 从操作表扫描并更新 kg_relations
   * 依赖 story_facts.relatedEntities、foreshadows、章节内容
   */
  indexRelations(bookId: string, chapterId?: string): Promise<void>;

  /**
   * 全量重建索引（用于首次迁移或数据修复）
   */
  rebuildAll(bookId: string): Promise<void>;
}
```

**触发时机**：

```
post-save hook（异步，不阻塞保存操作）：

  setting_entities 保存后 → indexer.indexEntities(bookId, 'setting_entities', entityId)
  story_facts 保存后     → indexer.indexEntities(bookId, 'story_facts', factId)
                           indexer.indexRelations(bookId)
  chapters.content 保存后 → indexer.indexEntities(bookId, 'chapters', chapterId)
                            indexer.indexRelations(bookId, chapterId)
  foreshadows 保存后     → indexer.indexRelations(bookId)
```

### 4.3 Model Router — 模型路由

**职责**：根据任务类型和质量需求，选择最优的 AI 模型。

**边界**：
- 只负责选模型，不负责调用
- v1 阶段可退化为返回默认模型
- 不感知具体的 prompt 内容

```typescript
// server/knowledge/model-router.ts

interface ModelConfig {
  id: string;
  contextSize: number;
  costPer1kInput: number;
  costPer1kOutput: number;
  tags: string[];  // 'fast' | 'cheap' | 'creative' | 'structured'
}

interface RoutingTask {
  adapterId: string;
  qualityNeeded: 'low' | 'medium' | 'high';
  estimatedTokens: number;
}

interface ModelRouter {
  /** 注册可用模型 */
  registerModel(config: ModelConfig): void;

  /** 根据任务选择模型 */
  select(task: RoutingTask): ModelConfig;

  /** 获取所有可用模型 */
  listModels(): ModelConfig[];
}
```

**路由策略**（v1 简化版可硬编码）：

| 质量需求 | 优先选择 | 备选 |
|---------|---------|------|
| low（事实提取/检查） | cheap + fast | 任何可用模型 |
| medium（大纲生成） | structured + creative | balanced |
| high（正文生成/润色） | creative | balanced |

### 4.4 Generation History — 生成历史

**职责**：记录每次 AI 调用的完整快照，支撑回溯、统计、质量评估。

**边界**：
- 只负责读写 `ai_generation_sessions` 表
- 不负责调用 AI（那是适配层的事）
- 不负责数据展示（那是应用层的事）

```typescript
// server/knowledge/generation-history.ts

interface GenerationSession {
  id: string;
  bookId: string;
  adapterId: string;
  chapterId?: string;
  inputSnapshot: string;      // JSON
  userInput: string;
  rawOutput: string;
  parsedResults: string;      // JSON
  adoptedFields: string[];    // JSON array
  model: string;
  tokensInput: number;
  tokensOutput: number;
  cost: number;
  latencyMs: number;
  createdAt: string;
}

interface GenerationHistory {
  /** 保存一次生成记录 */
  save(session: Omit<GenerationSession, 'id' | 'createdAt'>): Promise<GenerationSession>;

  /** 获取某书的生成历史 */
  listByBook(bookId: string, options?: {
    adapterId?: string;
    chapterId?: string;
    limit?: number;
    offset?: number;
  }): Promise<GenerationSession[]>;

  /** 获取某次生成的详情 */
  get(sessionId: string): Promise<GenerationSession | null>;

  /** 统计某书的 AI 使用情况 */
  getStats(bookId: string): Promise<{
    totalSessions: number;
    totalTokensInput: number;
    totalTokensOutput: number;
    totalCost: number;
    byAdapter: Record<string, number>;    // 各 adapter 调用次数
  }>;
}
```

### 4.5 ContextManager — 上下文窗口管理

**职责**：管理多轮对话的上下文窗口，确保不超出模型 token 限制。

**边界**：
- 只负责消息列表的组装和压缩
- 不负责 AI 调用（由适配层调用 AiService）
- 压缩策略只作用于对话历史，不压缩 system prompt 和 program data

```typescript
// server/knowledge/context-manager.ts

interface ContextMessage {
  role: 'system' | 'system-summary' | 'user' | 'assistant';
  content: string;
}

interface ContextWindow {
  /** 模型上下文上限 */
  modelContextLimit: number;
  /** 系统提示词（不压缩） */
  systemPrompt: string;
  /** 程序数据（不压缩） */
  programData: string;
  /** 当前生成结果（不压缩） */
  currentResult: string;
  /** 输出预留 token */
  reservedOutput: number;   // 默认 2000
}

interface ContextManager {
  /**
   * 组装最终发送给模型的消息列表
   * 只压缩对话历史，不压缩 systemPrompt / programData / currentResult
   */
  buildMessages(
    window: ContextWindow,
    conversationHistory: ContextMessage[]
  ): ContextMessage[];

  /**
   * 估算 token 数
   * v1 可用近似算法（中文 1 字 ≈ 2 token，英文 1 词 ≈ 1.3 token）
   */
  countTokens(text: string): number;

  /**
   * 压缩旧对话为摘要
   * v1 可用简单截断策略（保留最近 N 轮）
   */
  compressHistory(
    history: ContextMessage[],
    availableTokens: number
  ): ContextMessage[];
}
```

### 4.6 ContentVersion — 内容版本控制

**职责**：为所有内容实体（章节、总纲、卷纲、章纲）提供版本历史，支持回退。

**边界**：
- 只负责版本的创建和查询，不负责业务逻辑
- 恢复操作由应用层触发，ContentVersion 只负责创建新版本
- 版本清理策略在这一层实现

```typescript
// server/knowledge/content-version.ts

type VersionEntityType = 'chapter' | 'book_outline' | 'volume_outline' | 'chapter_outline';

interface ContentVersion {
  id: string;
  entityType: VersionEntityType;
  entityId: string;
  version: number;
  content: string;
  contentDelta: string;     // JSON: 与上一版本的差异
  source: 'manual' | 'ai_generate' | 'ai_edit';
  aiSessionId?: string;
  createdAt: number;
  createdBy: 'user' | 'ai';
}

interface ContentVersionService {
  /**
   * 创建新版本
   * 自动递增版本号，内容相同时不创建（去重）
   */
  create(params: {
    entityType: VersionEntityType;
    entityId: string;
    content: string;
    source: ContentVersion['source'];
    aiSessionId?: string;
  }): Promise<ContentVersion>;

  /**
   * 获取版本列表（倒序，最新的在前）
   */
  listVersions(
    entityType: VersionEntityType,
    entityId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<ContentVersion[]>;

  /**
   * 获取单个版本
   */
  getVersion(versionId: string): Promise<ContentVersion | null>;

  /**
   * 恢复到指定版本（创建一个新版本，内容来自旧版本）
   * 不删除任何历史
   */
  restore(versionId: string): Promise<ContentVersion>;

  /**
   * 对比两个版本
   */
  diff(versionIdA: string, versionIdB: string): Promise<{
    added: string;
    removed: string;
    unchanged: string;
  }>;

  /**
   * 清理旧版本（保留最近 N 个完整快照，更早的只保留 delta）
   */
  compress(entityType: VersionEntityType, entityId: string, keepRecent?: number): Promise<void>;
}
```

**版本创建时机**：
- 手动保存内容 → `source: 'manual'`
- AI 生成后采纳 → `source: 'ai_generate'`，同时记录 `aiSessionId`
- AI 编辑后采纳 → `source: 'ai_edit'`，同时记录 `aiSessionId`
- 内容未变化时不创建版本（去重）

**恢复操作**：恢复 = 创建一个新版本（内容来自旧版本），不删除任何历史：

```
v1 → v2 → v3 → v4（当前）
                    ↓ restore(v2)
v1 → v2 → v3 → v4 → v5（内容和 v2 相同）
```

### 4.7 知识层统一入口

```typescript
// server/knowledge/index.ts

interface KnowledgeLayer {
  context: LayerRegistry;
  query: ContextQueryService;
  indexer: KgIndexer;
  router: ModelRouter;
  history: GenerationHistory;
  contextManager: ContextManager;
  versions: ContentVersionService;
}

function createKnowledgeLayer(db: Database): KnowledgeLayer {
  return {
    context: createLayerRegistry(db),
    query: createContextQuery(db),
    indexer: createKgIndexer(db),
    router: createModelRouter(),
    history: createGenerationHistory(db),
    contextManager: createContextManager(),
    versions: createContentVersionService(db),
  };
}
```

---

## 五、适配层 (Adapter)

### 5.1 适配器定义

**职责**：声明一个 AI 功能的完整行为——需要什么数据、怎么生成 prompt、输出什么格式。

**边界**：
- 适配器不直接访问数据库，通过知识层接口获取数据
- 适配器不直接调 AI Service，通过知识层的 ModelRouter 选模型，然后由 PromptBuilder 组装请求
- 适配器不负责 UI 渲染，只声明 UI 需要的信息

```typescript
// server/adapters/adapter.ts

type InteractionMode = 'explore' | 'plan' | 'draft' | 'check';

interface StageAdapterDefinition {
  /** 唯一标识，如 'outline_explore' */
  id: string;

  /** 显示名称 */
  displayName: string;

  /** 一句话描述 */
  description: string;

  /** 交互模式 */
  mode: InteractionMode;

  // ── 数据需求 ──

  /** 需要哪些上下文层 */
  requiredLayers: ContextLayerName[];

  /** 需要 ContextQuery 的哪些查询（可选） */
  queryScope?: {
    entityTypes?: string[];
    recentChapters?: number;
    relationTypes?: string[];
  };

  // ── 提示词 ──

  /** 对应的提示词模板 function_key */
  promptKey: string;

  /** 是否支持多轮对话 */
  multiTurn: boolean;

  // ── 输出 ──

  /** 输出格式 */
  outputFormat: 'options' | 'structured' | 'text' | 'report';

  /** structured 模式下的字段定义 */
  outputFields?: OutputField[];

  // ── 模型偏好 ──

  /** 推荐质量级别 */
  qualityNeeded: 'low' | 'medium' | 'high';

  /** 预估输出 token 上限 */
  estimatedOutputTokens?: number;

  // ── 面板 UI ──

  /** 面板标题 */
  panelTitle: string;

  /** 用户输入区 placeholder */
  inputPlaceholder?: string;

  /** 是否显示模板选择器 */
  showTemplateSelector: boolean;
}

interface OutputField {
  key: string;
  label: string;
  type: 'text' | 'textarea';
  required: boolean;
  placeholder?: string;
}
```

### 5.2 适配器注册表

```typescript
// server/adapters/registry.ts

interface AdapterRegistry {
  register(adapter: StageAdapterDefinition): void;
  get(id: string): StageAdapterDefinition | null;
  getByMode(mode: InteractionMode): StageAdapterDefinition[];
  getAll(): StageAdapterDefinition[];
}
```

### 5.3 Prompt Builder

**职责**：加载模板 → 替换变量 → 注入防护 → 输出最终 prompt。

**边界**：
- 只负责模板渲染，不负责数据加载（由知识层负责）
- 变量校验在「保存时」执行，不在「使用时」执行
- 注入防护是最后一道防线，校验失败则拒绝调用

```typescript
// server/adapters/prompt-builder.ts

interface PromptTemplate {
  id: string;
  functionKey: string;
  displayName: string;
  description: string;
  template: string;
  variables: PromptVariable[];
  isDefault: boolean;
  updatedAt: string;
}

interface PromptVariable {
  name: string;
  label: string;
  description: string;
  source: ContextLayerName;
  required: boolean;
  formatter?: 'text' | 'list' | 'numbered_list' | 'compact';
}

interface PromptBuilder {
  /** 加载模板（默认模板或用户自定义） */
  loadTemplate(functionKey: string, templateId?: string): Promise<PromptTemplate>;

  /** 渲染模板（变量替换） */
  render(
    template: PromptTemplate,
    variables: Record<string, string>
  ): string;

  /** 变量校验（保存时调用） */
  validate(templateText: string, allowedVariables: PromptVariable[]): ValidationResult;

  /** 注入防护 */
  sanitize(prompt: string): string;
}

interface ValidationResult {
  valid: boolean;
  errors: Array<{
    variable: string;
    position: number;
    message: string;
  }>;
}
```

### 5.4 执行引擎

**职责**：串联整个 AI 调用流程——加载上下文 → 渲染 prompt → 调用 AI → 解析输出 → 记录历史。

```typescript
// server/adapters/executor.ts

interface AdapterExecutor {
  /**
   * 执行一个 AI 适配器
   */
  execute(
    adapterId: string,
    params: {
      bookId: string;
      chapterId?: string;
      volumeId?: string;
      userInput?: string;
      templateId?: string;
      /** 多轮对话历史（非首次调用时传入） */
      conversationHistory?: ContextMessage[];
      /** 调用层自定义覆盖数据 */
      overrides?: Record<string, any>;
    }
  ): Promise<AdapterExecutionResult>;
}

interface AdapterExecutionResult {
  /** 适配器 ID */
  adapterId: string;

  /** 输出结果 */
  results: AdapterOutput[];

  /** 原始 AI 输出 */
  rawOutput: string;

  /** 对话历史（用于多轮） */
  conversationHistory: ContextMessage[];

  /** 本次生成记录 ID */
  sessionId: string;

  /** token 使用情况 */
  tokens: { input: number; output: number };

  /** 是否被压缩过 */
  wasCompressed: boolean;
}

interface AdapterOutput {
  /** 字段 key */
  key: string;

  /** 字段标签 */
  label: string;

  /** 生成的内容 */
  content: string;

  /** 是否可采纳（structured 模式） */
  adoptable: boolean;
}
```

**执行流程**：

```
execute(adapterId, params)
  │
  ├── 1. 加载适配器定义
  │     adapterRegistry.get(adapterId)
  │
  ├── 2. 加载上下文数据
  │     adapter.requiredLayers → context.load(layers)
  │     如有 queryScope → query 补充数据
  │
  ├── 3. 加载提示词模板
  │     promptBuilder.loadTemplate(adapter.promptKey, params.templateId)
  │
  ├── 4. 变量替换
  │     将上下文数据填入模板变量
  │
  ├── 5. 上下文窗口管理
  │     如果 multiTurn:
  │       contextManager.buildMessages(窗口配置, 对话历史)
  │     否则:
  │       直接使用渲染后的 prompt
  │
  │     promptBuilder.sanitize(最终 prompt)  // 注入防护
  │
  ├── 6. 选择模型
  │     modelRouter.select({ adapterId, qualityNeeded, estimatedTokens })
  │
  ├── 7. 调用 AI
  │     aiService.complete({ messages, model, ... })
  │
  ├── 8. 解析输出
  │     根据 adapter.outputFormat 解析：
  │     - structured → JSON 解析为 AdapterOutput[]
  │     - text → 直接包装
  │     - options → 解析为选项列表
  │     - report → 解析为问题列表
  │
  ├── 9. 记录历史
  │     history.save({ 输入快照, 输出, tokens, ... })
  │
  └── 10. 返回结果
        AdapterExecutionResult
```

### 5.5 核心适配器清单

#### 总纲探索（outline_explore）

```typescript
const outlineExploreAdapter: StageAdapterDefinition = {
  id: 'outline_explore',
  displayName: '总纲探索',
  description: '根据书籍元信息探索故事方向',
  mode: 'explore',
  requiredLayers: ['book'],
  promptKey: 'outline_explore',
  multiTurn: true,
  outputFormat: 'options',
  qualityNeeded: 'medium',
  panelTitle: 'AI 探索',
  inputPlaceholder: '描述你想要的故事方向...',
  showTemplateSelector: true,
};
```

#### 卷纲规划（volume_plan）

```typescript
const volumePlanAdapter: StageAdapterDefinition = {
  id: 'volume_plan',
  displayName: '卷纲规划',
  description: '根据总纲和已有卷纲规划新卷',
  mode: 'plan',
  requiredLayers: ['book', 'story', 'volume'],
  promptKey: 'volume_plan',
  multiTurn: true,
  outputFormat: 'structured',
  outputFields: [
    { key: 'title', label: '卷标题', type: 'text', required: true },
    { key: 'synopsis', label: '卷梗概', type: 'textarea', required: true },
    { key: 'coreConflict', label: '核心冲突', type: 'textarea', required: true },
    { key: 'developmentArc', label: '发展弧线', type: 'textarea', required: false },
    { key: 'highlights', label: '预计看点', type: 'textarea', required: false },
  ],
  qualityNeeded: 'medium',
  panelTitle: 'AI 规划',
  inputPlaceholder: '描述这一卷的方向...',
  showTemplateSelector: true,
};
```

#### 章纲规划（chapter_plan）

```typescript
const chapterPlanAdapter: StageAdapterDefinition = {
  id: 'chapter_plan',
  displayName: '章纲规划',
  description: '根据卷纲规划章节节拍',
  mode: 'plan',
  requiredLayers: ['book', 'story', 'volume', 'chapter', 'settings'],
  queryScope: { recentChapters: 5 },
  promptKey: 'chapter_plan',
  multiTurn: true,
  outputFormat: 'structured',
  outputFields: [
    { key: 'title', label: '章标题', type: 'text', required: true },
    { key: 'synopsis', label: '章梗概', type: 'textarea', required: true },
    { key: 'scenes', label: '场景列表', type: 'textarea', required: true },
    { key: 'keyPoints', label: '重点内容', type: 'textarea', required: false },
  ],
  qualityNeeded: 'medium',
  panelTitle: 'AI 规划',
  inputPlaceholder: '描述这一章要写什么...',
  showTemplateSelector: true,
};
```

#### 正文生成（content_generate）

```typescript
const contentGenerateAdapter: StageAdapterDefinition = {
  id: 'content_generate',
  displayName: '正文生成',
  description: '根据章纲生成正文',
  mode: 'draft',
  requiredLayers: ['book', 'story', 'chapter', 'content', 'settings', 'rules', 'facts'],
  queryScope: { entityTypes: ['character'] },
  promptKey: 'content_generate',
  multiTurn: false,
  outputFormat: 'text',
  qualityNeeded: 'high',
  estimatedOutputTokens: 4000,
  panelTitle: 'AI 写作',
  inputPlaceholder: '补充写作要求（可选）...',
  showTemplateSelector: true,
};
```

#### 一致性检查（consistency_check）

```typescript
const consistencyCheckAdapter: StageAdapterDefinition = {
  id: 'consistency_check',
  displayName: '一致性检查',
  description: '检查故事事实、角色状态、伏笔的一致性',
  mode: 'check',
  requiredLayers: ['book', 'story', 'rules'],
  queryScope: { entityTypes: ['character', 'item'], recentChapters: 20 },
  promptKey: 'consistency_check',
  multiTurn: false,
  outputFormat: 'report',
  qualityNeeded: 'medium',
  panelTitle: 'AI 检查',
  showTemplateSelector: false,
};
```

### 5.6 扩展适配器注册示例

```typescript
// 注册一个自定义的角色弧线分析适配器
adapterRegistry.register({
  id: 'character_arc',
  displayName: '角色弧线分析',
  description: '分析某个角色在指定章节范围内的弧线变化',
  mode: 'check',
  requiredLayers: ['book', 'settings'],
  queryScope: { entityTypes: ['character'], recentChapters: 30 },
  promptKey: 'character_arc_check',
  multiTurn: false,
  outputFormat: 'report',
  qualityNeeded: 'medium',
  panelTitle: '角色分析',
  showTemplateSelector: false,
});
```

---

## 六、应用层 (Application)

### 6.1 AI 面板组件

根据交互模式，应用层有 4 种面板组件，每种对应一种 InteractionMode：

```typescript
// app/components/ai-panel/

interface AiPanelBaseProps {
  /** 适配器 ID */
  adapterId: string;
  /** 当前上下文 */
  context: {
    bookId: string;
    chapterId?: string;
    volumeId?: string;
  };
  /** 采纳回调 */
  onAdopt: (results: AdapterOutput[]) => void;
  /** 关闭回调 */
  onClose?: () => void;
}

// 探索模式面板（多选项卡片）
interface AiExplorePanelProps extends AiPanelBaseProps {}

// 规划模式面板（字段卡片 + 采纳）
interface AiPlanPanelProps extends AiPanelBaseProps {
  /** 已保护的字段 key（不被 AI 覆盖） */
  protectedFields?: Set<string>;
}

// 生成模式面板（全文预览 + 场景分段）
interface AiDraftPanelProps extends AiPanelBaseProps {}

// 检查模式面板（问题列表 + 修复建议）
interface AiCheckPanelProps extends AiPanelBaseProps {
  /** 修复回调 */
  onFix?: (issue: ConsistencyIssue, fix: string) => void;
}
```

### 6.2 面板调用流程

```
用户点击「AI 生成」
  │
  ├── 应用层显示对应面板
  │     new AiPlanPanel({ adapterId: 'volume_plan', context: { bookId, volumeId } })
  │
  ├── 面板加载时：
  │     调用 API: POST /api/ai/execute
  │     body: { adapterId, bookId, chapterId?, volumeId? }
  │
  ├── 后端执行适配器：
  │     executor.execute('volume_plan', params)
  │     → 返回 AdapterExecutionResult
  │
  ├── 面板渲染结果
  │     根据 outputFormat 渲染不同 UI
  │
  ├── 用户编辑/选择
  │
  └── 用户点击「采纳」
        调用 onAdopt(results)
        应用层负责：
        1. 调用 ContentVersion.create() 保存当前版本快照
        2. 写入表单 / 数据库
```

### 6.3 API 端点

```typescript
// POST /api/ai/execute
// 执行一个 AI 适配器
interface ExecuteRequest {
  adapterId: string;
  bookId: string;
  chapterId?: string;
  volumeId?: string;
  userInput?: string;
  templateId?: string;
  conversationHistory?: ContextMessage[];
  overrides?: Record<string, any>;
}

// POST /api/ai/execute-stream
// 流式执行（正文生成等长输出场景）
// Same as ExecuteRequest, SSE response

// GET /api/ai/templates/:functionKey
// 获取某个功能的提示词模板列表

// PUT /api/ai/templates/:templateId
// 更新提示词模板

// GET /api/ai/sessions?bookId=xxx
// 获取生成历史列表

// GET /api/ai/stats?bookId=xxx
// 获取 AI 使用统计

// GET /api/ai/versions?entityType=chapter&entityId=xxx
// 获取内容版本历史

// POST /api/ai/versions/:id/restore
// 恢复到指定版本

// GET /api/ai/versions/:id/diff/:targetId
// 对比两个版本

// GET /api/ai/query/character?bookId=xxx&name=萧炎
// 查询角色完整画像

// GET /api/ai/query/entities?bookId=xxx&q=xxx
// 搜索实体

// GET /api/ai/kg/check?bookId=xxx
// 执行一致性检查
```

---

## 七、边界约束汇总

### 7.1 禁止事项

| 禁止 | 原因 |
|------|------|
| AI 直接写入数据库 | 必须经用户确认 |
| 适配层直接访问数据库 | 必须通过知识层 |
| 应用层直接调 AI Service | 必须通过适配层 |
| 知识层操作 UI 状态 | 单向数据流 |
| 在模板中硬编码数据获取逻辑 | 数据获取由上下文层负责 |
| 适配器之间互相调用 | 每个适配器独立 |
| 上下文层之间互相依赖 | 每层独立加载 |
| 用户手动编辑 kg_* 表 | 索引表由系统自动维护 |

### 7.2 必须遵守

| 必须 | 原因 |
|------|------|
| AI 输出必须用户确认后才写入 | 安全性 |
| 每次 AI 调用记录到 Generation History | 可追溯性 |
| 内容保存时自动创建 ContentVersion | 可回退性 |
| 提示词模板必须通过变量校验 | 模板安全性 |
| 注入防护必须在 prompt 发送前执行 | 安全性 |
| 上下文数据必须经过格式化后才能放入 prompt | 数据质量 |
| token 估算必须在调用前执行 | 防止超出上下文窗口 |

---

## 八、错误处理规范

### 8.1 AI Service 错误

| 错误类型 | 处理方式 | 用户提示 |
|---------|---------|---------|
| API Key 未配置 | 阻断调用 | "请先在设置中配置 AI API Key" |
| 网络超时 | 重试 1 次，仍失败则报错 | "AI 响应超时，请稍后重试" |
| API 限流 | 等待后重试（指数退避，最多 3 次） | "请求过于频繁，请稍后重试" |
| 返回内容为空 | 报错 | "AI 未返回有效内容，请重试" |
| 返回格式无法解析 | 返回 rawOutput 让用户查看 | "AI 输出格式异常，原始内容已展示" |

### 8.2 上下文管理错误

| 错误类型 | 处理方式 |
|---------|---------|
| token 估算超出模型上限 | 自动压缩对话历史，若仍超出则截断 |
| 必填变量缺失（如 storyCore 为空） | 在 prompt 中替换为 `[数据不可用]` 并继续 |
| ContextQuery 查询失败 | 降级为不使用查询补充数据，继续执行 |

### 8.3 适配器错误

| 错误类型 | 处理方式 |
|---------|---------|
| 适配器 ID 不存在 | 返回 404 |
| 必需上下文层加载失败 | 返回错误，提示用户补充数据 |
| 提示词模板不存在 | 使用内置默认模板 |

---

## 九、性能规范

### 9.1 Token 预算管理

每次 AI 调用前，必须计算 token 预算：

```
总预算 = model.contextSize
固定占用 = systemPrompt tokens + programData tokens + reservedOutput (2000)
可用空间 = 总预算 - 固定占用

如果 对话历史 tokens > 可用空间:
  → 压缩旧对话（保留最近 N 轮原文）
  → 压缩后的摘要 + 最近 N 轮 = 最终对话历史
```

### 9.2 数据加载优化

| 场景 | 策略 |
|------|------|
| 书籍元信息 | 缓存在前端 state，不每次重新加载 |
| 设定实体（关联的） | 只加载章纲关联的实体，不加载全部 |
| 事实库 | 只加载最近 50 条（full）/ 20 条（summary） |
| 伏笔 | 只加载 hidden 状态的 |
| 前章正文 | 只加载末尾 1000 字（full）/ 300 字（summary） |
| KG 索引查询 | 按需查询，不预加载全图 |

### 9.3 响应时间目标

| 场景 | 目标 |
|------|------|
| 总纲/卷纲/章纲生成 | < 10s |
| 正文生成（3000 字） | < 30s |
| 文本操作（扩写/润色） | < 15s |
| 一致性检查 | < 20s |
| 模板加载 | < 100ms |
| ContextQuery 查询 | < 200ms |
| 内容版本创建 | < 50ms |

---

## 十、扩展系统

### 10.1 新增适配器的步骤

1. 在 `server/adapters/` 下定义适配器配置
2. 在注册表中注册
3. 在提示词表中创建默认模板
4. （可选）在应用层创建专用面板组件

**无需修改**：
- 知识层代码
- 执行引擎代码
- API 路由代码

### 10.2 新增上下文层的步骤

1. 实现 `ContextLayer` 接口
2. 在 `LayerRegistry` 中注册
3. 在数据库中创建对应表（如需）

**影响范围**：适配器声明 `requiredLayers` 时可引用新层名。

### 10.3 新增 AI 模型的步骤

1. 在 ModelRouter 中注册模型配置
2. 无需修改其他代码

### 10.4 插件系统（未来）

```
plugin/
├── my-custom-adapter/
│   ├── adapter.json       // StageAdapterDefinition 配置
│   ├── prompt.txt         // 默认提示词模板
│   └── panel.tsx          // 可选：自定义面板组件
└── manifest.json          // 插件清单
```

**当前版本不实现插件系统，但架构设计保留了扩展点。**

---

## 十一、数据模型关系图

```
books ──────────────┬─────────────────────┬──────────────────┐
│                   │                     │                  │
├─ book_outlines    ├─ volumes ────────── chapters ───── content_versions
│                   │                     │                (替代 archived_chapters)
├─ world_rules      ├─ setting_entities   ├─ kg_entities
│                   │     ↑               ├─ kg_relations
├─ tag_categories   ├─ prompt_templates   │   (索引表，自动维护)
│                   │                     │
├─ foreshadows      ├─ ai_generation_sessions
│                   │
└─ story_facts ─────┘
     ↑ 操作数据
     └─────────────→ kg_entities / kg_relations (异步索引)
```

---

## 十二、实施路线图

### Phase 1：知识层基础

**目标**：Writing Context + ContextQuery + 基础适配器可运行

- [ ] 数据库新增表（ai_generation_sessions, prompt_templates, content_versions, kg_entities, kg_relations）
- [ ] Writing Context 9 层实现
- [ ] ContextQueryService（跨表联合查询）
- [ ] KG 索引器（post-save hook 自动维护 kg_* 表）
- [ ] ContextManager 基础版（token 估算 + 简单压缩）
- [ ] ContentVersionService（版本创建 + 查询 + 恢复）
- [ ] PromptBuilder（模板渲染 + 变量校验 + 注入防护）
- [ ] AdapterRegistry + 3 个核心适配器（outline_explore / volume_plan / content_generate）
- [ ] AdapterExecutor 串通
- [ ] API 端点（/api/ai/execute, /api/ai/versions, /api/ai/query）

### Phase 2：创作台 AI 集成

**目标**：总纲/卷纲/正文可使用 AI 辅助

- [ ] AiPlanPanel 组件（字段卡片 + 采纳）
- [ ] AiExplorePanel 组件（多选项卡片）
- [ ] AiDraftPanel 组件（全文预览）
- [ ] 提示词管理 UI（Settings 页面）
- [ ] 总纲 AI 一键生成
- [ ] 卷纲 AI 生成
- [ ] 正文 AI 生成
- [ ] 保存时自动创建版本快照

### Phase 3：一致性 + 历史

**目标**：一致性检查 + 生成历史 + 版本对比

- [ ] ConsistencyCheck 适配器
- [ ] AiCheckPanel 组件（问题列表 + 修复）
- [ ] ContextQuery 一致性查询完善
- [ ] Generation History + 统计面板
- [ ] 内容版本对比（diff）UI
- [ ] 版本恢复 UI

### Phase 4：模型路由 + 高级功能

**目标**：多模型支持 + 文本操作

- [ ] ModelRouter 实现
- [ ] 文本操作适配器（扩写/润色/重写/去AI味）
- [ ] AiDraftPanel 场景分段生成
- [ ] 流式响应支持
- [ ] AI 使用统计 Dashboard

### Phase 5：扩展 + 优化

**目标**：可扩展性 + 性能优化

- [ ] 扩展适配器注册机制
- [ ] 角色弧线分析 / 节奏分析等扩展适配器
- [ ] 跨书引用支持
- [ ] 插件系统原型
- [ ] 性能优化（缓存 / 并行加载）
- [ ] 版本历史压缩策略优化
