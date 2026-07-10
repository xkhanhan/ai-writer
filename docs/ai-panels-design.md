# AI 能力全面接入设计文档

> 创建时间：2026-07-10
> 状态：设计阶段
> 目标：为所有 workspace 面板接入 AI 能力，实现"数据驱动写作"的核心愿景

## 现状盘点

### 已有 AI 能力（可直接使用）

| Function Key | 用途 | 后端支持 | 前端接入 |
|---|---|---|---|
| `content_generate` | 根据大纲生成正文 | ✅ | ✅ ContentEditor |
| `review_extract` | 从章节提取结构化数据 | ✅ | ✅ ReviewResultPanel |
| `polish` | 润色文本 | ✅ | ✅ ContentEditor |
| `deslop` | 去除 AI 味 | ✅ | ✅ ContentEditor |
| `expand` | 扩写文本 | ✅ | ✅ ContentEditor |
| `character_audit` | 角色一致性检查 | ✅ | ❌ 无 UI |
| `fact_consistency` | 事实一致性检查 | ✅ | ❌ 无 UI |
| `book_synopsis_expand` | 书籍简介扩写 | ✅ | ❌ 无 UI |

### 关键缺口

1. **3 个 functionKey 有后端无前端**：`character_audit`、`fact_consistency`、`book_synopsis_expand`
2. **过审落库未接通**：`handleReviewConfirm` 只 `console.log`，数据不写入事实库/伏笔库
3. **正文库 AI 下拉不可用**：按钮有文案无 onClick
4. **伏笔库无后端持久化**：数据存 useState，刷新丢失
5. **提示词库未暴露**：组件已建好但不在 workspace 配置中

---

## 面板 AI 能力规划

### 优先级分层

| 优先级 | 面板 | 能力 | 理由 |
|---|---|---|---|
| **P0** | 创作区 | 过审落库 | 核心闭环，数据从提取到落库 |
| **P0** | 伏笔库 | 后端持久化 + AI 提取接入 | 当前数据会丢失 |
| **P1** | 设定库 | 角色一致性检查 | 已有 `character_audit` 后端 |
| **P1** | 事实库 | 事实一致性检查 | 已有 `fact_consistency` 后端 |
| **P1** | 正文库 | AI 按钮接通 | 占位按钮修复 |
| **P2** | 书籍信息 | 简介扩写 | 已有 `book_synopsis_expand` 后端 |
| **P2** | 世界规则 | AI 规则建议 | 新增 functionKey |
| **P3** | 标签库 | AI 自动打标 | 依赖设定库数据 |

---

## 详细设计

### 1. 过审落库（P0）

**目标**：用户在 ReviewResultPanel 确认选中项后，数据写入对应数据库

**数据流**：
```
AI 提取 → ReviewResultPanel（勾选）→ 确认 → API 批量写入
                                              ├→ facts 表（已有）
                                              ├→ foreshadows 表（需建）
                                              └→ setting_entities 表（已有，更新状态）
```

**API 变更**：
- `POST /api/ai/review/confirm` — 接收确认数据，批量写入
  ```typescript
  interface ReviewConfirmBody {
    bookId: string;
    chapterId: string;
    facts: Array<{ content: string; chapterNumber: number; relatedCharacters: string[] }>;
    foreshadowChanges: Array<{ action: "plant" | "resolve"; name: string; description: string }>;
    characterStates: Array<{ name: string; changes: { location?: string; knownInfo?: string[]; relationship?: string } }>;
  }
  ```

**前端变更**：
- `ContentEditor` 的 `handleReviewConfirm` 调用新 API
- 成功后刷新事实库/伏笔库/设定库数据

**数据库**：
- 新建 `foreshadows` 表（伏笔库后端持久化，见第 2 项）

---

### 2. 伏笔库后端持久化（P0）

**目标**：伏笔数据存入 SQLite，不再丢失

**数据库**：
```sql
CREATE TABLE IF NOT EXISTS foreshadows (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT DEFAULT 'hidden' CHECK(status IN ('hidden','revealed')),
  chapter_number INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_foreshadows_book ON foreshadows(book_id);
```

**API**：
- `GET /api/books/[bookId]/foreshadows` — 列表
- `POST /api/books/[bookId]/foreshadows` — 新建
- `PUT /api/foreshadows/[id]` — 更新
- `DELETE /api/foreshadows/[id]` — 删除

**Store**：`server/storage/foreshadow-store.ts`

**前端**：`ForeshadowLibrary` 改用 API 调用替代 useState

---

### 3. 设定库 — 角色一致性检查（P1）

**目标**：检查角色设定是否与已写内容矛盾

**触发方式**：设定库右侧面板头部加"AI 检查"按钮

**流程**：
1. 点击按钮 → 调用 `POST /api/ai/chat` with `functionKey: "character_audit"`
2. 后端 ContextBuilder 已支持，自动收集角色信息 + 章节内容
3. 返回检查结果（Markdown 文本）
4. 在设定库右侧显示结果面板（复用 AiResultPanel 样式）

**前端变更**：
- `SettingsLibrary` 新增 `CharacterAuditPanel` 子组件
- 点击按钮时展开，显示 AI 检查结果

---

### 4. 事实库 — 事实一致性检查（P1）

**目标**：检查事实之间是否存在矛盾

**触发方式**：事实库左侧面板工具栏加"AI 检查"按钮

**流程**：
1. 点击按钮 → 调用 `POST /api/ai/chat` with `functionKey: "fact_consistency"`
2. 后端收集所有事实 + 章节内容，检测矛盾
3. 返回检查结果（Markdown 文本）
4. 在事实库右侧显示结果面板

**前端变更**：
- `FactLibrary` 新增 `FactCheckPanel` 子组件

---

### 5. 正文库 AI 按钮接通（P1）

**目标**：让正文库的"去除 AI 味""全文润色""扩写"按钮真正可用

**流程**：
1. 点击按钮 → 获取归档章节内容
2. 调用 `POST /api/ai/chat` with 对应 functionKey + selectedText
3. 流式显示结果
4. 用户确认后替换归档内容（或创建新归档版本）

**前端变更**：
- `ContentLibrary` 的 `AiDropdown` 接入 `AiResultPanel`
- 新增 `onAdopt` 回调更新归档

---

### 6. 书籍信息 — 简介扩写（P2）

**目标**：AI 根据书籍信息自动扩写简介/sellingPoint

**触发方式**：书籍信息编辑弹窗中"简介"字段旁加"AI 扩写"按钮

**流程**：
1. 点击按钮 → 调用 `POST /api/ai/chat` with `functionKey: "book_synopsis_expand"`
2. 返回扩写结果
3. 用户确认后填入简介字段

**前端变更**：
- `BookInfoEditModal` 新增 AI 扩写按钮
- 复用 AiResultPanel 的流式显示逻辑

---

### 7. 世界规则 — AI 规则建议（P2）

**目标**：根据书籍类型自动建议世界规则

**新增 FunctionKey**：`world_rule_suggest`

**ContextBuilder 新增 builder**：
- 输入：书籍类型、已有规则
- 输出：建议的规则列表（JSON）

**触发方式**：世界规则左侧面板"AI 建议"按钮

**前端变更**：
- `WorldRules` 新增 `RuleSuggestPanel` 子组件
- 显示建议列表，用户逐条确认后创建

---

### 8. 标签库 — AI 自动打标（P3）

**目标**：AI 根据设定实体内容自动推荐标签

**触发方式**：设定库实体编辑时"AI 推荐标签"按钮

**依赖**：设定库实体数据 + 标签库数据

**实现**：复用 `content_generate` 的 ContextBuilder，传入实体信息 + 标签列表

---

## 开发顺序

### Phase 1：闭环打通（P0）
1. 伏笔库后端持久化（foreshadows 表 + API + Store）
2. 过审落库（/api/ai/review/confirm + 前端接通）

### Phase 2：已有能力接入（P1）
3. 设定库角色一致性检查
4. 事实库事实一致性检查
5. 正文库 AI 按钮接通

### Phase 3：新能力扩展（P2-P3）
6. 书籍简介扩写
7. 世界规则 AI 建议
8. 标签库自动打标

---

## 技术要点

### 复用模式

所有面板的 AI 能力遵循统一模式：
1. **触发**：按钮点击 → 设置 functionKey + 上下文参数
2. **调用**：`fetch("/api/ai/chat", { stream: true, ... })`
3. **显示**：复用或参考 `AiResultPanel` 的流式显示逻辑
4. **结果处理**：
   - 文本类（检查结果、扩写）→ 显示后可复制/采纳
   - 结构化数据（落库）→ 批量确认后调用写入 API

### AiResultPanel 抽取

当前 `AiResultPanel` 与 CreationZone 强耦合。建议：
- 提取为 `shared/ui/ai-result-panel/` 通用组件
- Props：`functionKey`, `bookId`, `chapterId?`, `selectedText?`, `onAdopt?`
- 各面板直接引用

### 上下文参数扩展

部分新能力需要额外上下文（如角色检查需要 `characterId`）：
- `buildContext` 的 input 已支持 `characterId`
- 事实一致性需要传入 `factIds` 或标记全量检查
- 世界规则建议需要书籍类型信息（已有）

---

## 验证清单

- [ ] 伏笔库数据刷新后不丢失
- [ ] 过审确认后事实写入事实库
- [ ] 过审确认后伏笔变更写入伏笔库
- [ ] 过审确认后角色状态更新到设定库
- [ ] 设定库角色检查返回有意义的结果
- [ ] 事实库一致性检查返回有意义的结果
- [ ] 正文库 AI 按钮可触发并显示结果
- [ ] 书籍简介扩写可触发并填入
- [ ] 所有 AI 功能流式输出正常
