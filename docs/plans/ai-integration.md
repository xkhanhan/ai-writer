# AI 集成架构 — 运行时设计

> 基于 architecture-v2.md 的提示词系统（第九节），设计运行时 AI 集成层。
> 核心原则：**程序数据 → AI（单向），AI 不回写程序数据。**

---

## 一、架构全景

```
┌──────────────────────────────────────────────────────────┐
│                    UI 触发层                              │
│  表单 AI 按钮 · 正文生成 · 文本操作 · 设定检查 · 过审      │
└─────────────────────┬────────────────────────────────────┘
                      │ functionKey
                      ▼
┌──────────────────────────────────────────────────────────┐
│              Variable Registry（变量注册表）               │
│  开发者维护的固定变量词汇表                                 │
│  每个变量 = 一个数据源，含 name / source / dataPath        │
└─────────────────────┬────────────────────────────────────┘
                      │ 变量定义
                      ▼
┌──────────────────────────────────────────────────────────┐
│               Prompt Template（提示词模板）                │
│  用户可编辑文本，但只能使用已注册的 $变量                    │
│  保存时校验：无效变量 → 标红报错 → 禁止保存                │
└─────────────────────┬────────────────────────────────────┘
                      │ 模板 + 变量列表
                      ▼
┌──────────────────────────────────────────────────────────┐
│         Context Provider（从变量推导数据）                  │
│                                                          │
│  解析模板中的 $变量 → 查注册表得 dataPath                   │
│  → 按 source 分组批量查询 → 格式化为文本                    │
└─────────────────────┬────────────────────────────────────┘
                      │ context (变量名→值)
                      ▼
┌──────────────────────────────────────────────────────────┐
│                Prompt Builder（模板渲染）                  │
│                                                          │
│  1. 加载 PromptTemplate                                   │
│  2. 用 context 替换 $变量                                 │
│  3. 注入防护检查                                          │
│  4. 输出最终 prompt 字符串                                 │
└─────────────────────┬────────────────────────────────────┘
                      │ prompt string
                      ▼
┌──────────────────────────────────────────────────────────┐
│                AI Service（LLM 调用）                     │
│                                                          │
│  generateAiText(prompt, { stream, timeout, retries })    │
│  返回 AiResponse { content, tokens, latency }            │
└─────────────────────┬────────────────────────────────────┘
                      │ AI 原始输出
                      ▼
┌──────────────────────────────────────────────────────────┐
│                Output Processor（输出处理）                │
│                                                          │
│  根据 adapter.outputMode 处理 AI 输出：                    │
│  - structured: 解析为结构化数据 → 逐字段展示供用户确认     │
│  - text: 直接展示原始文本 → 用户复制/应用                  │
└─────────────────────┬────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────┐
│                UI 展示层                                   │
│                                                          │
│  确认卡片 · 内联填充 · 文本面板 · 检查报告                │
│  用户确认 → 才写入程序数据                                 │
└──────────────────────────────────────────────────────────┘
```

---

## 二、变量注册表（Variable Registry）

**核心设计：变量是开发者维护的固定词汇表，用户不能新增。**

每个变量 = 一个数据源，由开发者在代码中注册。用户编辑提示词时只能使用已注册的变量。

```typescript
interface VariableDefinition {
  /** 变量名（不含 $），如 "bookGenre" */
  name: string;

  /** 人类可读说明，如 "书籍题材" */
  label: string;

  /** 详细描述，展示给用户看 */
  description: string;

  /** 数据来源 */
  source: "book" | "outline" | "volume" | "chapter" |
          "entities" | "rules" | "facts" | "foreshadows" |
          "content" | "freeText";

  /** source + 字段路径，如 "book.genre"、"chapter.title" */
  dataPath: string;

  /** 是否必填（AI 调用时此变量必须有值） */
  required: boolean;

  /** 变量所属的 AI 功能分类 */
  category: "outline" | "volume" | "chapter" | "content" |
            "settings" | "approval" | "text_operation";
}
```

### 全局变量注册表

开发者维护的完整变量列表，按分类组织：

```typescript
const VARIABLE_REGISTRY: VariableDefinition[] = [
  // ── 书籍信息（所有 AI 功能通用） ──
  { name: "bookTitle",       label: "书名",       source: "book",    dataPath: "book.title",           description: "书籍名称", required: true },
  { name: "bookGenre",       label: "题材",       source: "book",    dataPath: "book.genre",           description: "书籍题材，如：仙侠、都市", required: false },
  { name: "bookSubGenre",    label: "子题材",     source: "book",    dataPath: "book.subGenre",        description: "细分题材，如：凡人流", required: false },
  { name: "bookStyle",       label: "文风",       source: "book",    dataPath: "book.writingStyle",    description: "写作风格，如：平实内敛", required: false },
  { name: "bookAudience",    label: "受众",       source: "book",    dataPath: "book.targetAudience",  description: "目标读者，如：男频", required: false },
  { name: "bookReference",   label: "参考作品",   source: "book",    dataPath: "book.referenceWorks",  description: "参考作品列表", required: false },
  { name: "bookDescription", label: "书籍简介",   source: "book",    dataPath: "book.description",     description: "书籍简介", required: false },
  { name: "bookSellingPoint",label: "核心卖点",   source: "book",    dataPath: "book.sellingPoint",    description: "核心卖点", required: false },

  // ── 总纲 ──
  { name: "outlineStoryCore", label: "故事核心",  source: "outline", dataPath: "outline.storyCore",    description: "一句话概括故事", required: false },
  { name: "outlineConflict",  label: "核心冲突",  source: "outline", dataPath: "outline.conflict",     description: "故事主要矛盾", required: false },
  { name: "outlineEnding",    label: "结局方向",  source: "outline", dataPath: "outline.ending",       description: "大致结局走向", required: false },

  // ── 卷纲 ──
  { name: "volumeTitle",     label: "卷标题",     source: "volume",  dataPath: "volume.title",         description: "当前卷标题", required: false },
  { name: "volumeSynopsis",  label: "卷梗概",     source: "volume",  dataPath: "volume.synopsis",      description: "当前卷梗概", required: false },
  { name: "volumeStages",    label: "阶段规划",   source: "volume",  dataPath: "volume.stages",        description: "本卷的故事阶段列表", required: false },
  { name: "existingVolumes", label: "已有卷纲",   source: "volume",  dataPath: "volume.allExisting",   description: "已创建的所有卷纲摘要", required: false },

  // ── 章纲 ──
  { name: "chapterTitle",    label: "章标题",     source: "chapter", dataPath: "chapter.title",        description: "当前章标题", required: false },
  { name: "chapterSynopsis", label: "章梗概",     source: "chapter", dataPath: "chapter.synopsis",     description: "当前章梗概", required: false },
  { name: "chapterScenes",   label: "场景列表",   source: "chapter", dataPath: "chapter.scenes",       description: "本章场景列表", required: false },
  { name: "chapterKeyPoints",label: "重点内容",   source: "chapter", dataPath: "chapter.keyPoints",    description: "AI 必须写出的重点", required: false },
  { name: "chapterOpening",  label: "开头要求",   source: "chapter", dataPath: "chapter.opening",      description: "章节开头约束", required: false },
  { name: "chapterEnding",   label: "结尾要求",   source: "chapter", dataPath: "chapter.ending",       description: "章节结尾约束", required: false },
  { name: "chapterEntities", label: "出场实体",   source: "entities",dataPath: "chapter.entities",     description: "本章关联的设定实体详情", required: false },
  { name: "chapterNote",     label: "写作备注",   source: "chapter", dataPath: "chapter.note",         description: "作家的写作备注", required: false },

  // ── 设定库 ──
  { name: "entityName",      label: "实体名称",   source: "entities",dataPath: "entity.name",          description: "当前编辑的设定实体名称", required: false },
  { name: "entityDetail",    label: "实体详情",   source: "entities",dataPath: "entity.all",           description: "当前编辑的设定实体完整信息", required: false },
  { name: "allCharacters",   label: "全部角色",   source: "entities",dataPath: "entities.characters",  description: "设定库中所有角色的摘要", required: false },

  // ── 世界规则 ──
  { name: "globalRules",     label: "全局规则",   source: "rules",   dataPath: "rules.global",         description: "全局规则（创作基石）", required: false },
  { name: "writingRules",    label: "写作规则",   source: "rules",   dataPath: "rules.writing",        description: "写作规则（风格/文笔约束）", required: false },
  { name: "settingRules",    label: "设定规则",   source: "rules",   dataPath: "rules.setting",        description: "设定规则（校验约束）", required: false },

  // ── 事实库 ──
  { name: "recentFacts",     label: "近期事实",   source: "facts",   dataPath: "facts.recent50",       description: "最近 50 条故事事实", required: false },

  // ── 正文 ──
  { name: "previousChapter", label: "前一章正文", source: "content", dataPath: "content.previous",     description: "前一章的正文内容（用于上下文衔接）", required: false },
  { name: "selectedText",    label: "选中文本",   source: "content", dataPath: "content.selected",     description: "用户在正文中选中的文本", required: false },

  // ── 用户输入 ──
  { name: "freeText",        label: "用户输入",   source: "freeText",dataPath: "freeText",             description: "用户手动输入的文本", required: false },
];
```

**关键规则**：
- 变量列表由开发者维护，**用户不能新增变量**
- 用户编辑提示词时，只能从已有变量中选取插入
- 保存时校验所有 `$变量` 是否在注册表中，无效变量**立即标红报错**
- 不同 AI 功能展示不同的可用变量（按 category 过滤）

---

## 三、AI Adapter 定义

每个 AI 功能 = 一个 Adapter，声明输入输出行为。

```typescript
interface AiAdapter {
  /** 唯一标识，对应 PromptTemplate.functionKey */
  functionKey: string;

  /** 显示名称，如 "总纲生成" */
  displayName: string;

  /** 提示词模板 key（对应 PromptTemplate） */
  promptKey: string;

  /** AI 输出如何解析 */
  outputMode: "structured" | "text";

  /** structured 模式下的字段定义 */
  outputFields?: OutputField[];

  /** 描述该 AI 功能的一句话说明 */
  description: string;
}

interface OutputField {
  name: string;        // 字段名
  label: string;       // 展示名
  type: "text" | "textarea";
  required: boolean;
}
```

**注意**：Adapter **不再声明 dataScope**。数据需求由 PromptTemplate 中使用的变量自动推导。

**示例：总纲生成 Adapter**

```typescript
const outlineGenAdapter: AiAdapter = {
  functionKey: "outline_generate",
  displayName: "总纲生成",
  promptKey: "outline_generate",
  outputMode: "structured",
  outputFields: [
    { name: "storyCore", label: "故事核心", type: "textarea", required: true },
    { name: "conflict",  label: "核心冲突", type: "textarea", required: true },
    { name: "ending",    label: "结局方向", type: "textarea", required: true },
  ],
  description: "根据书籍元信息生成总纲草案",
};
```

**示例：正文生成 Adapter**

```typescript
const chapterGenAdapter: AiAdapter = {
  functionKey: "chapter_generate",
  displayName: "正文生成",
  promptKey: "chapter_generate",
  outputMode: "text",
  description: "根据章纲信息和上下文生成正文",
};
```

---

## 四、Context Provider — 从变量推导数据

Context Provider **不再接收 DataScope**，而是：
1. 加载 PromptTemplate，解析其中的 `$变量`
2. 在 VARIABLE_REGISTRY 中查找每个变量的 dataPath
3. 按 source 分组，批量查询数据
4. 格式化为 prompt 可用的文本

```typescript
class ContextProvider {
  /**
   * 从模板变量自动推导数据需求并组装
   */
  async assemble(
    bookId: string,
    template: PromptTemplate,
    overrides?: { freeText?: string; selectedText?: string }
  ): Promise<AiContext> {
    // 1. 解析模板中的变量
    const usedVars = extractVariables(template.template);
    // usedVars = ["bookGenre", "bookStyle", "bookReference", ...]

    // 2. 在注册表中查找每个变量的 dataPath
    const varDefs = usedVars.map(name =>
      VARIABLE_REGISTRY.find(v => v.name === name)
    ).filter(Boolean);

    // 3. 按 source 分组，批量查询
    const bySource = groupBy(varDefs, "source");
    const context: AiContext = {};

    if (bySource.book) {
      const book = await api.getBook(bookId);
      context.book = pickByDataPaths(book, bySource.book);
    }
    if (bySource.outline) {
      const outline = await api.getOutline(bookId);
      context.outline = pickByDataPaths(outline, bySource.outline);
    }
    if (bySource.chapter) {
      const chapter = await api.getCurrentChapter(bookId);
      context.chapter = pickByDataPaths(chapter, bySource.chapter);
    }
    // ... 其他 source

    // 4. 注入用户覆盖值
    if (overrides?.freeText) context.freeText = overrides.freeText;
    if (overrides?.selectedText) context.selectedText = overrides.selectedText;

    return context;
  }
}
```

**变量 → 值的格式化**：Context Provider 将数据转为人类可读文本，供 prompt 使用。

```typescript
function contextToVariables(context: AiContext): Record<string, string> {
  return {
    // 书籍信息 → 直接取值
    bookTitle: context.book?.title ?? "",
    bookGenre: context.book?.genre ?? "",
    bookStyle: context.book?.writingStyle ?? "",

    // 实体 → 格式化为列表
    chapterEntities: context.entities
      ?.map(e => `- ${e.name}（${e.description}）`)
      .join("\n") ?? "",

    // 规则 → 格式化为列表
    globalRules: context.rules
      ?.filter(r => r.category === "global")
      .map(r => `- ${r.content}`)
      .join("\n") ?? "",

    // 事实 → 格式化为列表
    recentFacts: context.facts
      ?.map(f => `- ${f.content}`)
      .join("\n") ?? "",
  };
}
```

---

## 五、Prompt Builder — 模板渲染 + 校验

### 5.1 变量校验（保存时）

用户编辑提示词后点保存，系统执行校验：

```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

interface ValidationError {
  variable: string;     // 无效的变量名，如 "$fooBar"
  position: number;     // 在模板中的位置
  message: string;      // 错误提示
}

function validateTemplate(
  template: string,
  allowedVariables: VariableDefinition[]
): ValidationResult {
  const errors: ValidationError[] = [];
  const allowedNames = new Set(allowedVariables.map(v => v.name));

  // 提取模板中所有 $变量
  const matches = template.matchAll(/\$([a-zA-Z]+)/g);
  for (const match of matches) {
    const varName = match[1];
    if (!allowedNames.has(varName)) {
      errors.push({
        variable: `$${varName}`,
        position: match.index!,
        message: `无效变量 "$${varName}"，请从可用变量列表中选择`,
      });
    }
  }

  return { valid: errors.length === 0, errors };
}
```

**UI 行为**：
- 保存时校验 → 无效变量在编辑器中**标红高亮**
- 错误信息展示在编辑器下方
- 有错误时**禁止保存**
- 用户必须删除或替换无效变量后才能保存

### 5.2 模板渲染（使用时）

```typescript
class PromptBuilder {
  async build(
    functionKey: string,
    context: AiContext
  ): Promise<string> {
    // 1. 加载模板
    const template = await this.loadTemplate(functionKey);

    // 2. 变量替换
    const variables = contextToVariables(context);
    let prompt = template;
    for (const [key, value] of Object.entries(variables)) {
      prompt = prompt.replace(new RegExp(`\\$${key}`, "g"), value);
    }

    // 3. 检查是否有未替换的变量（数据缺失）
    const remaining = prompt.matchAll(/\$([a-zA-Z]+)/g);
    for (const match of remaining) {
      // 未替换 = 数据源中没有值，替换为空串并记录警告
      prompt = prompt.replace(match[0], `[${match[1]}: 数据不可用]`);
    }

    // 4. 注入防护
    prompt = this.sanitize(prompt);

    return prompt;
  }
}
```

### 5.3 注入防护

```typescript
private sanitize(prompt: string): string {
  const patterns = [
    /ignore\s+(all\s+)?previous\s+instructions/i,
    /system\s*:\s*/i,
    /\[INST\]/i,
    /<<SYS>>/i,
  ];
  for (const p of patterns) {
    if (p.test(prompt)) {
      throw new Error("提示词包含潜在的注入风险，请检查内容");
    }
  }
  return prompt;
}
```

---

## 六、各场景 AI Adapter 清单

### 6.1 书籍信息（book-info）

| functionKey | 名称 | 变量范围 | outputMode |
|------------|------|---------|------------|
| `book_suggest` | 书籍信息建议 | freeText + book | structured |

> 用户输入一段书籍描述，AI 建议 genre/subGenre/writingStyle 等字段。

### 6.2 设定库（settings）

| functionKey | 名称 | 变量范围 | outputMode |
|------------|------|---------|------------|
| `entity_generate` | 角色生成 | book + freeText + entity | structured |
| `entity_check` | 设定规则检查 | entity + settingRules | structured |

### 6.3 标签库（tags）

| functionKey | 名称 | 变量范围 | outputMode |
|------------|------|---------|------------|
| `tags_suggest` | 标签建议 | book + allCharacters | text |

### 6.4 总纲（outline）

| functionKey | 名称 | 变量范围 | outputMode |
|------------|------|---------|------------|
| `outline_generate` | 总纲生成 | book + freeText | structured |

### 6.5 卷纲（volume）

| functionKey | 名称 | 变量范围 | outputMode |
|------------|------|---------|------------|
| `volume_generate` | 卷纲生成 | book + outline + existingVolumes | structured |
| `volume_check` | 卷纲检查 | outline + volume + globalRules | structured |

### 6.6 章纲（chapter-outline）

| functionKey | 名称 | 变量范围 | outputMode |
|------------|------|---------|------------|
| `chapter_generate` | 章纲生成 | book + volume + chapter | structured |
| `chapter_check` | 章纲检查 | chapter + chapterEntities + globalRules | structured |

### 6.7 正文（content）

| functionKey | 名称 | 变量范围 | outputMode |
|------------|------|---------|------------|
| `content_generate` | 正文生成 | book + chapter + chapterEntities + globalRules + writingRules + recentFacts + previousChapter | text |
| `content_expand` | 选中文本扩写 | selectedText + chapter + chapterEntities + writingRules | text |
| `content_polish` | 选中文本润色 | selectedText + chapter + writingRules | text |
| `content_rewrite` | 选中文本重写 | selectedText + chapter + chapterEntities + writingRules | text |
| `content_deslop` | 全文去AI味 | selectedText + writingRules | text |

### 6.8 过审（approval）

| functionKey | 名称 | 变量范围 | outputMode |
|------------|------|---------|------------|
| `approval_facts` | 事实提取 | chapterContent + recentFacts | structured |
| `approval_states` | 状态变更检测 | chapterContent + allCharacters | structured |
| `approval_foreshadows` | 伏笔处理 | chapterContent + foreshadows | structured |

---

## 七、UI 集成模式

AI 在 UI 中有 4 种出现方式，按场景选择：

### 7.1 AiPanel — 纯黑盒 AI 生成组件（核心）

**适用**：所有需要 AI 辅助生成内容的场景。面板是**纯黑盒**，不含任何业务逻辑。

#### 设计原则

```
调用层（业务）                     AI 面板（黑盒）
┌─────────────────┐              ┌─────────────────┐
│ 知道：           │  结构化参数   │ 不知道：         │
│ - 当前什么场景    │ ──────────→  │ - 字段保护/锁定  │
│ - 要生成什么字段  │              │ - 数据写入哪里    │
│ - 已有什么数据    │   ←────────  │ - 业务规则       │
│ - 用哪个提示词    │  生成结果     │                  │
│ - 采纳后怎么处理  │              │ 知道：           │
│                  │              │ - 渲染输入区      │
│ 保护/锁定/填表单  │  调用层处理   │ - 渲染结果卡片    │
│ = 调用层的事      │              │ - 提示词模板选择  │
└─────────────────┘              └─────────────────┘
```

#### 组件接口

```typescript
interface AiPanelProps {
  // ===== 输入：调用层传入 =====

  // 当前上下文（告诉面板"你在哪"）
  context: {
    panel: string                 // 当前面板，如 'outline' / 'volume' / 'character'
    scenario: string              // 场景，如 'outline_generate' / 'character_create'
  }

  // 要生成的字段定义
  fields: AiFieldConfig[]

  // 当前程序数据（作为 AI 上下文传入）
  // 面板不关心数据结构，只负责传给 AI
  programData: Record<string, any>

  // 提示词模板列表（当前场景可用的模板）
  promptTemplates: PromptTemplate[]
  defaultTemplateId: string       // 默认模板

  // 用户输入区配置
  inputPlaceholder?: string

  // ===== 输出：调用层监听 =====

  // 用户点击生成
  onGenerate: (params: {
    input: string                 // 用户输入的想法
    templateId: string            // 选中的模板 ID
    fields: string[]              // 要生成的字段 key 列表
  }) => void

  // 用户采纳（单个或全部）
  onAdopt: (results: AiFieldResult[]) => void

  // 用户切换模板
  onTemplateChange?: (templateId: string) => void
}

interface AiFieldConfig {
  key: string
  label: string
  placeholder?: string
}

interface AiFieldResult {
  key: string
  content: string
}

interface PromptTemplate {
  id: string
  name: string                    // 模板名称，如"默认总纲生成"
  description?: string
}
```

#### 面板内部结构

```
┌─────────────────────────────────────┐
│ AI 生成                    [模板 ▾] │ ← 模板选择器
├─────────────────────────────────────┤
│                                     │
│  ┌─ 用户输入 ─────────────────┐     │
│  │ 描述你想要的内容...         │     │
│  └────────────────────────────┘     │
│  [✨ 生成]                          │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  ┌─ 字段卡片 1 ──────────────┐      │
│  │ 标题: 故事核心              │      │
│  │ [可编辑内容区]              │      │
│  │ [采纳]                     │      │
│  └────────────────────────────┘     │
│                                     │
│  ┌─ 字段卡片 2 ──────────────┐      │
│  │ 标题: 核心冲突              │      │
│  │ [可编辑内容区]              │      │
│  │ [采纳]                     │      │
│  └────────────────────────────┘     │
│                                     │
│  [一键采纳全部]                      │
│                                     │
└─────────────────────────────────────┘
```

#### 调用层示例 — 总纲场景

```typescript
// 总纲页面调用 AiPanel
<AiPanel
  context={{ panel: 'outline', scenario: 'outline_generate' }}
  fields={[
    { key: 'storyCore', label: '故事核心' },
    { key: 'conflict', label: '核心冲突' },
    { key: 'ending', label: '结局方向' },
  ]}
  programData={{
    bookGenre: book.genre,
    bookStyle: book.writingStyle,
    bookAudience: book.targetAudience,
    // ...其他需要传给 AI 的程序数据
  }}
  promptTemplates={outlineTemplates}  // 从提示词库加载
  defaultTemplateId="outline_default"
  inputPlaceholder="描述你想要的故事方向..."
  onGenerate={({ input, templateId, fields }) => {
    // 调用层决定如何调 AI
    callAiAdapter('outline_generate', { input, templateId, fields })
  }}
  onAdopt={(results) => {
    // 调用层决定如何处理采纳结果
    // 自己实现保护字段逻辑
    results.forEach(r => {
      if (!isLocked(r.key)) {
        setFormField(r.key, r.content)
      }
    })
  }}
/>
```

#### 调用层示例 — 角色场景

```typescript
// 角色创建页面调用同一个 AiPanel
<AiPanel
  context={{ panel: 'character', scenario: 'character_create' }}
  fields={[
    { key: 'personality', label: '性格特征' },
    { key: 'background', label: '人物背景' },
    { key: 'motivation', label: '核心动机' },
  ]}
  programData={{
    worldRules: currentWorldRules,
    existingCharacters: allCharacters,
    genre: book.genre,
  }}
  promptTemplates={characterTemplates}
  defaultTemplateId="character_default"
  onAdopt={(results) => {
    // 角色场景自己的处理逻辑
    setCharacterFields(results)
  }}
/>
```

#### 面板状态流转

```
Empty → Generating → Review → (可编辑) → Adopted → Empty
         (用户输入)   (卡片)                (可重新开始)
```

#### 关键设计

| 设计点 | 说明 |
|--------|------|
| **黑盒** | 面板不知道字段保护、锁定、数据写入等业务逻辑 |
| **场景感知** | 通过 `context` 知道当前在哪，但不据此做业务判断 |
| **模板选择** | 每个场景提供模板列表，用户可切换，面板只渲染选择器 |
| **数据透传** | `programData` 原样传给 AI，面板不解析不处理 |
| **输出纯净** | `onAdopt` 只抛出 `{ key, content }[]`，调用层自行处理 |
| **复用** | 总纲/卷纲/章纲/角色/书籍信息/标签... 同一个组件 |

### 7.1.1 业务层 — 保护字段逻辑（调用层实现）

AI 面板不管保护字段。调用层根据自己的需求实现：

```typescript
// 总纲页面的保护逻辑（调用层实现）
function handleAdopt(results: AiFieldResult[]) {
  results.forEach(r => {
    // 业务层决定：已锁定的字段不覆盖
    if (lockedFields.has(r.key)) return
    // 业务层决定：写入哪个表单字段
    outlineForm.setFieldValue(r.key, r.content)
  })
}
```

不同场景可以有不同的保护策略：
- **总纲**：用户可以锁定某些字段
- **卷纲**：锁定已保存的卷纲字段
- **角色**：锁定已有角色设定
- **标签**：无保护，全部覆盖

### 7.1.2 提示词模板选择（面板内置）

面板内置模板选择器（下拉或标签切换）：
- 调用层传入当前场景可用的模板列表
- 用户可以选择不同模板（不同风格/角度的生成）
- 不选择则使用默认模板
- 切换模板后需要重新生成才能生效
- 面板通过 `onGenerate` 回调传出选中的 `templateId`

### 7.1.3 多轮对话与上下文管理

AiPanel 支持多轮对话 — 用户可以持续输入想法，AI 在对话中逐步细化生成内容。

#### 上下文窗口结构

```
模型上下文上限（如 8K / 32K / 128K，按模型实际能力）
┌────────────────────────────────────────────┐
│ System Prompt（不压缩）                      │
│  · 提示词模板文本                            │
│  · fields 定义（要生成哪些字段）              │
├────────────────────────────────────────────┤
│ Program Data（不压缩）                       │
│  · 书籍信息、角色、设定等程序数据             │
├────────────────────────────────────────────┤
│ 压缩区（超 token 限制时自动压缩旧对话）        │
│  · 旧对话压缩为摘要                          │
│  · 摘要保留用户的核心意图和决策               │
├────────────────────────────────────────────┤
│ 最近对话（保留原文）                          │
│  · 最近 N 轮 user/assistant 消息            │
├────────────────────────────────────────────┤
│ 当前生成结果（不压缩）                        │
│  · 字段卡片内容                              │
├────────────────────────────────────────────┤
│ 输出预留                                     │
└────────────────────────────────────────────┘
```

#### 压缩策略

```typescript
class ContextManager {
  /**
   * 根据模型上下文上限管理对话历史
   * 只压缩对话历史，不压缩系统提示词和程序数据
   */
  buildMessages(
    modelContextLimit: number,      // 模型实际上下文 token 数
    systemPrompt: string,           // 提示词模板（固定）
    programData: string,            // 程序数据（固定）
    conversationHistory: Message[], // 对话历史
    currentResult: string,          // 当前生成结果（固定）
    reservedOutput: number = 2000   // 输出预留 token
  ): Message[] {
    // 1. 计算固定占用
    const fixedTokens = countTokens(systemPrompt)
      + countTokens(programData)
      + countTokens(currentResult)
      + reservedOutput;

    // 2. 可用空间 = 上限 - 固定占用
    const availableTokens = modelContextLimit - fixedTokens;

    // 3. 对话历史总 token
    const historyTokens = countTokens(conversationHistory);

    if (historyTokens <= availableTokens) {
      // 未超限 → 全部保留原文
      return [systemMsg, dataMsg, ...conversationHistory, resultMsg];
    }

    // 4. 超限 → 压缩旧对话，保留最近 N 轮
    const recentMessages = takeRecent(conversationHistory, availableTokens);
    const oldMessages = conversationHistory.slice(0, -recentMessages.length);
    const summary = this.summarize(oldMessages); // AI 或规则压缩

    return [
      systemMsg, dataMsg,
      { role: 'system', content: `[之前的讨论摘要] ${summary}` },
      ...recentMessages,
      resultMsg,
    ];
  }
}
```

#### 关键设计

| 设计点 | 说明 |
|--------|------|
| **压缩阈值** | 基于模型实际 token 上限，不硬编码轮数 |
| **压缩什么** | 只压缩对话历史（user/assistant 消息） |
| **不压缩** | System Prompt、programData、当前生成结果、输出预留 |
| **压缩方式** | 旧对话 → AI 生成摘要，保留核心意图和用户决策 |
| **最近保留** | 保留最近 N 轮原文（N 由 token 空间决定） |
| **模型适配** | 不同模型不同上限，ContextManager 按实际值计算 |

#### 面板内部数据流

```
用户输入 "主角要有金手指"
  → ContextManager.buildMessages()
  → 拼接: systemPrompt + programData + [压缩区 + 最近对话] + 当前结果
  → 调用 AI API
  → AI 返回更新后的字段卡片内容
  → 渲染到面板
  → 对话历史 +1 轮
```

### 7.2 文本操作（text action）

**适用**：正文中选中文本的扩写/润色/重写。

```
┌──────────────────────────────────┐
│ 选中的文本会高亮显示...            │
└──────────────────────────────────┘
┌─ 浮层 ──────────────────────────┐
│ [扩写] [润色] [重写] [去AI味]    │
└──────────────────────────────────┘
        ↓ 点击"扩写"
┌─ 结果面板 ─────────────────────┐
│ AI 生成的扩展文本               │
│                                │
│ [替换原文] [追加到后] [取消]    │
└────────────────────────────────┘
```

**行为**：
- 选中文本 → 浮层出现操作按钮
- 点击操作 → 调用 adapter → 结果展示在浮层面板
- 用户选择：替换原文 / 追加到选中文本后 / 取消
- **注意**：这是 AI 输出唯一的"写入"场景，但仍然是用户确认后才替换

### 7.3 AI 对话面板（chat panel）— 后续版本

**适用**：深度对话式分析，如角色发展建议、情节分析。

```
┌──────────────────────┬───────────────┐
│     主内容区          │  AI 对话面板  │
│                      │               │
│  （章纲/正文等）      │  程序数据 → AI │
│                      │  对话式交互    │
│                      │  分析/建议     │
│                      │  AI 不回写     │
└──────────────────────┴───────────────┘
```

**行为**：
- 面板自动加载当前上下文（当前章纲、设定等）
- 用户可以提问，AI 基于上下文回答
- AI 的建议是参考性的，不自动应用
- **当前版本不做**，预留接口
- 与 AiGenerationPanel 的区别：面板是对话式的，Panel 是卡片式的

### 7.4 过程式调用（process call）

**适用**：过审流程中的 AI 辅助（事实提取、状态变更检测）。

**行为**：
- 用户点击"过审" → 系统自动调用多个 adapter
- 结果不是展示给用户确认的，而是系统内部使用
- 事实提取结果 → 写入事实库
- 状态变更检测 → 展示给用户确认后写入设定库
- 伏笔处理 → 展示给用户确认后写入伏笔库

---

## 八、Prompt 模板管理（Settings 页面）

### 8.1 模板列表页

```
┌─────────────────────────────────────────────┐
│  AI 提示词管理                               │
│                                             │
│  ┌─ 创作台 ──────────────────────────────┐  │
│  │  总纲生成                    [编辑]    │  │
│  │  卷纲生成                    [编辑]    │  │
│  │  卷纲检查                    [编辑]    │  │
│  │  章纲生成                    [编辑]    │  │
│  │  正文生成                    [编辑]    │  │
│  └───────────────────────────────────────┘  │
│  ┌─ 文本操作 ────────────────────────────┐  │
│  │  扩写                          [编辑]  │  │
│  │  润色                          [编辑]  │  │
│  │  重写                          [编辑]  │  │
│  │  去AI味                        [编辑]  │  │
│  └───────────────────────────────────────┘  │
│  ┌─ 设定库 ──────────────────────────────┐  │
│  │  角色生成                      [编辑]  │  │
│  │  设定规则检查                  [编辑]  │  │
│  └───────────────────────────────────────┘  │
│  ┌─ 过审 ────────────────────────────────┐  │
│  │  事实提取                      [编辑]  │  │
│  │  状态变更检测                  [编辑]  │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### 8.2 模板编辑页

```
┌─────────────────────────────────────────────┐
│  编辑提示词 — 总纲生成                        │
│                                             │
│  说明：根据书籍元信息生成总纲草案              │
│  可用变量：点击变量名插入到模板中              │
│                                             │
│  ┌─ 模板 ─────────────────────────────────┐ │
│  │ 你是一位资深网络小说作家。               │ │
│  │ 请根据以下书籍信息，生成总纲。           │ │
│  │                                         │ │
│  │ ## 书籍信息                             │ │
│  │ 题材：$bookGenre                        │ │
│  │ 文风：$bookStyle                        │ │
│  │ 参考：$bookReference                    │ │
│  │ 简介：$bookDescription                  │ │
│  │                                         │ │
│  │ ## 要求                                 │ │
│  │ 请生成：                                │ │
│  │ 1. 故事核心（一句话，50字内）            │ │
│  │ 2. 核心冲突（主要矛盾）                 │ │
│  │ 3. 结局方向（大致走向）                 │ │
│  │ 不要生成主角信息。                       │ │
│  └─────────────────────────────────────────┘ │
│                                             │
│  可用变量：                                  │
│  $bookTitle  $bookGenre  $bookStyle         │
│  $bookReference  $bookDescription           │
│  $bookAudience  $bookSellingPoint           │
│                                             │
│  ┌─ 预览 ─────────────────────────────────┐ │
│  │ 使用示例数据替换变量后的最终 prompt       │ │
│  └─────────────────────────────────────────┘ │
│                                             │
│           [恢复默认]  [保存]                 │
└─────────────────────────────────────────────┘
```

### 8.3 模板数据模型（已在 architecture-v2 定义）

```typescript
interface PromptTemplate {
  id: string;
  functionKey: string;
  displayName: string;
  description: string;
  template: string;
  variables: PromptVariable[];
  isDefault: boolean;          // 是否为系统默认
  updatedAt: string;
}

interface PromptVariable {
  name: string;
  description: string;
  source: "book" | "outline" | "volume" | "chapter" |
          "settings" | "rules" | "facts" | "foreshadows" | "text";
  required: boolean;
  defaultValue?: string;
}
```

---

## 九、数据流总结

### 9.1 单向原则

```
程序数据 ──→ Context Provider ──→ Prompt Builder ──→ AI Service
                                                         │
                                                         ▼
                                                    AI 原始输出
                                                         │
                                                         ▼
                                                    Output Processor
                                                         │
                                                    ┌────┴────┐
                                                    │         │
                                                  structured  text
                                                    │         │
                                                    ▼         ▼
                                              用户确认卡片  文本面板
                                                    │         │
                                                    ▼         ▼
                                              写入程序数据  替换/追加
```

**关键**：AI 输出不会自动写入程序数据。structured 模式必须用户逐字段确认，text 模式必须用户选择"替换/追加"。

### 9.2 各场景变量使用范围

| 场景 | book | outline | volume | chapter | entities | rules | facts | content | freeText |
|------|------|---------|--------|---------|----------|-------|-------|---------|----------|
| 书籍建议 | - | - | - | - | - | - | - | - | ✓ |
| 角色生成 | ✓ | - | - | - | - | - | - | - | ✓ |
| 设定检查 | - | - | - | - | ✓ | ✓(setting) | - | - | - |
| 总纲生成 | ✓ | - | - | - | - | - | - | - | ✓ |
| 卷纲生成 | ✓ | ✓ | ✓ | - | - | - | - | - | - |
| 卷纲检查 | - | ✓ | ✓ | - | - | ✓(global) | - | - | - |
| 章纲生成 | ✓ | - | ✓ | - | - | - | - | - | - |
| 正文生成 | ✓ | - | - | ✓ | ✓ | ✓(global,writing) | ✓ | ✓(prev) | - |
| 文本操作 | - | - | - | ✓ | - | ✓(writing) | - | ✓(context) | ✓(selected) |
| 过审 | - | - | - | ✓ | ✓ | - | ✓ | - | - |

---

## 十、实施计划

### Phase 1：基础设施

- [ ] Variable Registry（变量注册表）
- [ ] AI Adapter Registry（adapter 注册表）
- [ ] Context Provider（从模板变量推导数据）
- [ ] Prompt Builder（模板渲染 + 变量校验 + 注入防护）
- [ ] AI Service 封装（统一调用层）

### Phase 2：Prompt 模板管理

- [ ] Settings 页面 — 提示词管理 UI
- [ ] 模板编辑器（变量高亮 + 预览）
- [ ] 模板数据持久化（数据库）

### Phase 3：创作台 AI 集成

- [ ] 总纲 AI 一键生成（首个实例）
- [ ] 卷纲 AI 生成
- [ ] 章纲 AI 生成
- [ ] 正文 AI 生成

### Phase 4：文本操作

- [ ] 选中文本浮层
- [ ] 扩写/润色/重写/去AI味

### Phase 5：设定库 AI 集成

- [ ] 角色生成
- [ ] 设定规则检查

### Phase 6：过审 AI 辅助

- [ ] 事实提取
- [ ] 状态变更检测
- [ ] 伏笔处理
