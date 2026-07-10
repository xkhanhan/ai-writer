import { randomUUID } from "node:crypto";
import { getDb } from "@/server/storage/db";

export type PromptTemplateRow = {
  id: string;
  book_id: string | null;
  function_key: string;
  display_name: string;
  description: string;
  template: string;
  variables: string;
  is_default: number;
  is_active: number;
  created_at: string;
  updated_at: string;
};

export type PromptTemplate = {
  id: string;
  bookId: string | null;
  functionKey: string;
  displayName: string;
  description: string;
  template: string;
  variables: PromptVariable[];
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PromptVariable = {
  name: string;
  description: string;
  source: string;
  required: boolean;
};

export type CreatePromptTemplateDTO = {
  bookId?: string | null;  // optional, null for system-level templates
  functionKey: string;
  displayName: string;
  description?: string;
  template: string;
  variables?: PromptVariable[];
};

export type UpdatePromptTemplateDTO = {
  displayName?: string;
  description?: string;
  template?: string;
  variables?: PromptVariable[];
  isActive?: boolean;
};

function mapRow(row: PromptTemplateRow): PromptTemplate {
  return {
    id: row.id,
    bookId: row.book_id,
    functionKey: row.function_key,
    displayName: row.display_name,
    description: row.description ?? "",
    template: row.template,
    variables: JSON.parse(row.variables ?? "[]") as PromptVariable[],
    isDefault: row.is_default === 1,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getPromptTemplatesByBook(
  bookId: string,
  functionKey?: string,
): Promise<PromptTemplate[]> {
  await ensureDefaultTemplates();
  const db = await getDb();
  if (functionKey) {
    const rows = db
      .prepare(
        `SELECT * FROM prompt_templates
         WHERE (book_id = ? OR book_id IS NULL) AND function_key = ?
         ORDER BY created_at DESC`,
      )
      .all(bookId, functionKey) as PromptTemplateRow[];
    return rows.map(mapRow);
  }
  const rows = db
    .prepare(
      `SELECT * FROM prompt_templates
       WHERE book_id = ? OR book_id IS NULL
       ORDER BY created_at DESC`,
    )
    .all(bookId) as PromptTemplateRow[];
  return rows.map(mapRow);
}

export async function getPromptTemplate(
  id: string,
): Promise<PromptTemplate | null> {
  const db = await getDb();
  const row = db
    .prepare(`SELECT * FROM prompt_templates WHERE id = ?`)
    .get(id) as PromptTemplateRow | undefined;
  return row ? mapRow(row) : null;
}

export async function createPromptTemplate(
  bookId: string | null | undefined,
  data: CreatePromptTemplateDTO,
): Promise<PromptTemplate> {
  const db = await getDb();
  const id = randomUUID();
  const finalBookId = data.bookId !== undefined ? data.bookId : (bookId ?? null);
  const variables = JSON.stringify(data.variables ?? []);

  db.prepare(
    `INSERT INTO prompt_templates (id, book_id, function_key, display_name, description, template, variables)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    finalBookId,
    data.functionKey,
    data.displayName,
    data.description ?? "",
    data.template,
    variables,
  );

  const row = db
    .prepare(`SELECT * FROM prompt_templates WHERE id = ?`)
    .get(id) as PromptTemplateRow;
  return mapRow(row);
}

export async function updatePromptTemplate(
  id: string,
  data: UpdatePromptTemplateDTO,
): Promise<PromptTemplate | null> {
  const db = await getDb();
  const fields: string[] = [];
  const values: Array<string | number> = [];

  if (data.displayName !== undefined) {
    fields.push("display_name = ?");
    values.push(data.displayName);
  }
  if (data.description !== undefined) {
    fields.push("description = ?");
    values.push(data.description);
  }
  if (data.template !== undefined) {
    fields.push("template = ?");
    values.push(data.template);
  }
  if (data.variables !== undefined) {
    fields.push("variables = ?");
    values.push(JSON.stringify(data.variables));
  }
  if (data.isActive !== undefined) {
    fields.push("is_active = ?");
    values.push(data.isActive ? 1 : 0);
  }

  if (fields.length === 0) {
    return getPromptTemplate(id);
  }

  fields.push("updated_at = datetime('now')");
  values.push(id);

  db.prepare(
    `UPDATE prompt_templates SET ${fields.join(", ")} WHERE id = ?`,
  ).run(...values);

  return getPromptTemplate(id);
}

export async function deletePromptTemplate(id: string): Promise<boolean> {
  const db = await getDb();
  const row = db
    .prepare(`SELECT is_default FROM prompt_templates WHERE id = ?`)
    .get(id) as { is_default: number } | undefined;

  if (!row) return false;
  if (row.is_default === 1) {
    throw new Error("Cannot delete a system default template.");
  }

  const result = db
    .prepare(`DELETE FROM prompt_templates WHERE id = ?`)
    .run(id);
  return result.changes > 0;
}

export async function copyGlobalToBook(
  bookId: string,
  functionKey: string,
): Promise<PromptTemplate> {
  const db = await getDb();

  const globalRow = db
    .prepare(
      `SELECT * FROM prompt_templates
       WHERE book_id IS NULL AND function_key = ? AND is_default = 1
       LIMIT 1`,
    )
    .get(functionKey) as PromptTemplateRow | undefined;

  if (!globalRow) {
    throw new Error(`No global default template found for functionKey "${functionKey}".`);
  }

  const existingBookRow = db
    .prepare(
      `SELECT id FROM prompt_templates
       WHERE book_id = ? AND function_key = ? AND book_id IS NOT NULL
       LIMIT 1`,
    )
    .get(bookId, functionKey) as PromptTemplateRow | undefined;

  if (existingBookRow) {
    throw new Error(
      `Book-level template already exists for book "${bookId}" and functionKey "${functionKey}".`,
    );
  }

  const newId = randomUUID();
  db.prepare(
    `INSERT INTO prompt_templates (id, book_id, function_key, display_name, description, template, variables, is_default, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1)`,
  ).run(
    newId,
    bookId,
    globalRow.function_key,
    globalRow.display_name,
    globalRow.description,
    globalRow.template,
    globalRow.variables,
  );

  const newRow = db
    .prepare(`SELECT * FROM prompt_templates WHERE id = ?`)
    .get(newId) as PromptTemplateRow;
  return mapRow(newRow);
}

export async function deleteBookOverride(
  bookId: string,
  functionKey: string,
): Promise<boolean> {
  const db = await getDb();
  const result = db
    .prepare(
      `DELETE FROM prompt_templates
       WHERE book_id = ? AND function_key = ? AND book_id IS NOT NULL`,
    )
    .run(bookId, functionKey);
  return result.changes > 0;
}

export async function getTemplateScope(
  bookId: string,
  functionKey: string,
): Promise<"global" | "book"> {
  const db = await getDb();
  const row = db
    .prepare(
      `SELECT 1 FROM prompt_templates
       WHERE book_id = ? AND function_key = ? AND is_active = 1 AND book_id IS NOT NULL
       LIMIT 1`,
    )
    .get(bookId, functionKey) as unknown;
  return row ? "book" : "global";
}

export async function getAllFunctionKeys(): Promise<
  Array<{ functionKey: string; displayName: string; description: string }>
> {
  const db = await getDb();
  const rows = db
    .prepare(
      `SELECT DISTINCT function_key as functionKey,
              display_name as displayName,
              description
       FROM prompt_templates
       WHERE book_id IS NULL AND is_default = 1`,
    )
    .all() as Array<{ functionKey: string; displayName: string; description: string }>;
  return rows;
}

export async function getActivePromptTemplate(
  bookId: string,
  functionKey: string,
): Promise<PromptTemplate | null> {
  // Lazy-seed: ensure system defaults exist on first call
  await ensureDefaultTemplates();

  const db = await getDb();

  // Priority 1: book-specific active template
  const active = db
    .prepare(
      `SELECT * FROM prompt_templates
       WHERE book_id = ? AND function_key = ? AND is_active = 1
       LIMIT 1`,
    )
    .get(bookId, functionKey) as PromptTemplateRow | undefined;

  if (active) return mapRow(active);

  // Priority 2: system-level default template
  const systemDefault = db
    .prepare(
      `SELECT * FROM prompt_templates
       WHERE book_id IS NULL AND function_key = ? AND is_default = 1
       LIMIT 1`,
    )
    .get(functionKey) as PromptTemplateRow | undefined;

  if (systemDefault) return mapRow(systemDefault);

  // Priority 3: book-specific default (legacy fallback)
  const bookDefault = db
    .prepare(
      `SELECT * FROM prompt_templates
       WHERE book_id = ? AND function_key = ? AND is_default = 1
       LIMIT 1`,
    )
    .get(bookId, functionKey) as PromptTemplateRow | undefined;

  return bookDefault ? mapRow(bookDefault) : null;
}

// ============================================================================
// Seed: system-level default templates
// ============================================================================

let _seeded = false;

async function ensureDefaultTemplates(): Promise<void> {
  if (_seeded) return;
  const db = await getDb();
  const count = db
    .prepare(`SELECT COUNT(*) as c FROM prompt_templates WHERE book_id IS NULL`)
    .get() as { c: number };
  if (count.c > 0) { _seeded = true; return; }

  const now = new Date().toISOString();
  const insert = db.prepare(
    `INSERT INTO prompt_templates (id, book_id, function_key, display_name, description, template, variables, is_default, is_active, created_at, updated_at)
     VALUES (?, NULL, ?, ?, ?, ?, ?, 1, 0, ?, ?)`,
  );

  const seeds: Array<{ functionKey: string; displayName: string; description: string; template: string; variables: string }> = [
    {
      functionKey: "content_generate",
      displayName: "正文生成",
      description: "根据章纲信息生成小说正文",
      template: `你是一位专注于网络小说创作的资深作家。请根据以下章纲信息撰写正文。

## 输出格式
- 直接输出正文，不加标题、注释或总结
- 目标字数：$expectedWords 字（允许 ±15%）

---

## 书籍信息
书名：$bookTitle
题材：$bookGenre
写作风格：$bookStyle

## 世界规则
$worldRules

## 写作规则
$writingRules

## 章纲信息
标题：$chapterTitle
摘要：$chapterSummary
场景：$chapterScenes
出场人物：$chapterCharacters
重要事件：$chapterKeyEvents

## 角色档案
$characterProfiles

## 事实记录
$facts

## 活跃伏笔
$foreshadows

## 前文衔接
$previousEnding`,
      variables: JSON.stringify([
        { name: "bookTitle", description: "书名", source: "book", required: true },
        { name: "bookGenre", description: "题材", source: "book", required: true },
        { name: "bookStyle", description: "写作风格", source: "book", required: false },
        { name: "worldRules", description: "全局规则", source: "world_rules", required: false },
        { name: "writingRules", description: "写作规则", source: "world_rules", required: false },
        { name: "chapterTitle", description: "章节标题", source: "chapter", required: true },
        { name: "chapterSummary", description: "章节摘要", source: "chapter", required: false },
        { name: "chapterScenes", description: "场景列表", source: "chapter", required: false },
        { name: "chapterCharacters", description: "出场人物", source: "chapter", required: false },
        { name: "chapterKeyEvents", description: "重要事件", source: "chapter", required: false },
        { name: "characterProfiles", description: "角色档案", source: "settings", required: false },
        { name: "facts", description: "事实记录", source: "facts", required: false },
        { name: "foreshadows", description: "活跃伏笔", source: "foreshadows", required: false },
        { name: "previousEnding", description: "前文结尾", source: "chapter", required: false },
        { name: "expectedWords", description: "目标字数", source: "chapter", required: true },
      ]),
    },
    {
      functionKey: "review_extract",
      displayName: "过审提取",
      description: "从章节正文中提取结构化数据（事实、伏笔、角色状态）",
      template: `你是一位小说数据提取专家。请从以下正文中提取结构化信息。

## 输出格式
请以 JSON 格式返回以下内容：

\`\`\`json
{
  "facts": [
    {"content": "事实描述", "chapterNumber": N, "relatedCharacters": ["角色名"]}
  ],
  "foreshadowChanges": [
    {"action": "plant"|"resolve", "name": "伏笔名称", "description": "描述"}
  ],
  "characterStates": [
    {"name": "角色名", "changes": {"location": "新位置", "knownInfo": ["新信息"], "relationship": "关系变化"}}
  ],
  "itemStates": [
    {"name": "物品名", "changes": {"status": "新状态"}}
  ]
}
\`\`\`

---

## 章纲信息
$chapterInfo

## 正文内容
$chapterContent

## 现有角色设定
$existingCharacters

## 现有伏笔
$existingForeshadows`,
      variables: JSON.stringify([
        { name: "chapterInfo", description: "章纲信息", source: "chapter", required: false },
        { name: "chapterContent", description: "正文内容", source: "chapter_content", required: true },
        { name: "existingCharacters", description: "现有角色设定", source: "settings", required: false },
        { name: "existingForeshadows", description: "现有伏笔", source: "foreshadows", required: false },
      ]),
    },
    {
      functionKey: "polish",
      displayName: "润色",
      description: "提升文字表现力和感染力",
      template: `你是一位资深网文编辑。请对以下文本进行润色。

## 输出格式
- 保持字数大致不变（±10%）
- 直接输出润色后的文本，不加注释或说明

---

## 书籍信息
书名：$bookTitle
题材：$bookGenre

## 写作规则
$writingRules

## 目标字数
$targetWords

## 章节上下文
$chapterContext

## 原文
$selectedText`,
      variables: JSON.stringify([
        { name: "bookTitle", description: "书名", source: "book", required: true },
        { name: "bookGenre", description: "题材", source: "book", required: false },
        { name: "writingRules", description: "写作规则", source: "world_rules", required: false },
        { name: "selectedText", description: "选中文本", source: "user_selection", required: true },
        { name: "targetWords", description: "目标字数", source: "user_input", required: false },
        { name: "chapterContext", description: "章纲背景", source: "chapter", required: false },
      ]),
    },
    {
      functionKey: "deslop",
      displayName: "去AI味",
      description: "去除AI生成痕迹，让文字更自然",
      template: `你是一位经验丰富的网文编辑。请对以下文本进行"去AI味"处理。

## 必须删除的模式
- "值得注意的是"、"让我们来看看"、"总而言之"
- "在这个..."开头的段落
- 过度使用排比句（3个以上并列）
- 每段开头都是主语+谓语的单调句式
- 过多的"的"字连用（3个以上）

## 必须增加的元素
- 口语化表达（根据人物身份）
- 不规则句式（短句、倒装、省略）
- 五感细节（至少2种感官）

---

## 书籍信息
书名：$bookTitle
题材：$bookGenre

## 写作规则
$writingRules

## 目标字数
$targetWords

## 章节上下文
$chapterContext

## 原文
$selectedText`,
      variables: JSON.stringify([
        { name: "selectedText", description: "选中文本", source: "user_selection", required: true },
        { name: "bookTitle", description: "书名", source: "book", required: true },
        { name: "bookGenre", description: "题材", source: "book", required: false },
        { name: "writingRules", description: "写作规则", source: "world_rules", required: false },
        { name: "targetWords", description: "目标字数", source: "user_input", required: false },
        { name: "chapterContext", description: "章纲背景", source: "chapter", required: false },
      ]),
    },
    {
      functionKey: "expand",
      displayName: "扩写",
      description: "丰富细节，扩展文本长度",
      template: `你是一位资深网络小说作家。请对以下片段进行扩写。

## 输出格式
- 在保持原有情节的基础上丰富细节
- 增加环境描写、心理活动、对话等
- 扩写到约 $targetWords 字

---

## 书籍信息
书名：$bookTitle
题材：$bookGenre

## 写作规则
$writingRules

## 背景
$chapterContext

## 原文片段
$selectedText`,
      variables: JSON.stringify([
        { name: "bookTitle", description: "书名", source: "book", required: true },
        { name: "bookGenre", description: "题材", source: "book", required: false },
        { name: "writingRules", description: "写作规则", source: "world_rules", required: false },
        { name: "selectedText", description: "选中文本", source: "user_selection", required: true },
        { name: "targetWords", description: "目标字数", source: "user_input", required: false },
        { name: "chapterContext", description: "章纲背景", source: "chapter", required: false },
      ]),
    },
    {
      functionKey: "character_audit",
      displayName: "角色一致性检查",
      description: "检查角色在已写章节中的表现是否符合设定",
      template: `你是一位小说角色一致性审查专家。请检查以下角色在已写章节中的表现是否符合设定。

## 审查输出要求
- 对比角色实际行为与角色设定
- 标注 OOC（Out of Character）片段
- 检查能力边界是否合理
- 检查人际关系是否连贯
- 给出修改建议

---

## 角色设定
$characterProfile

## 世界规则
$worldRules

## 相关事实记录
$facts

## 已写章节中该角色出现的片段
$characterAppearances`,
      variables: JSON.stringify([
        { name: "characterProfile", description: "角色设定", source: "settings", required: true },
        { name: "worldRules", description: "世界规则", source: "world_rules", required: false },
        { name: "facts", description: "相关事实", source: "facts", required: false },
        { name: "characterAppearances", description: "角色出场片段", source: "chapters", required: false },
      ]),
    },
    {
      functionKey: "fact_consistency",
      displayName: "事实一致性检查",
      description: "交叉验证已记录事实，检测矛盾",
      template: `你是一位小说事实一致性检查专家。请对已记录的事实进行交叉验证。

## 检查输出要求
- 检查事实之间是否存在矛盾
- 检查事实是否与世界规则冲突
- 标注时间线不一致的问题
- 标注角色信息不一致的问题
- 给出修复建议

---

## 世界规则
$worldRules

## 角色设定
$characterSettings

## 事实记录
$facts`,
      variables: JSON.stringify([
        { name: "worldRules", description: "世界规则", source: "world_rules", required: false },
        { name: "characterSettings", description: "角色设定", source: "settings", required: false },
        { name: "facts", description: "事实记录", source: "facts", required: true },
      ]),
    },
    {
      functionKey: "book_synopsis_expand",
      displayName: "书籍简介扩写",
      description: "扩写书籍简介，增加吸引力",
      template: `你是一位资深网络小说策划。请对以下书籍简介进行扩写。

## 输出要求
- 在保持核心卖点不变的前提下丰富细节
- 增加悬念和吸引力
- 控制在 $targetWords 字以内
- 适合在小说平台展示

---

## 书籍信息
书名：$bookTitle
题材：$bookGenre

## 写作规则
$writingRules

## 原始简介
$originalDescription

## 核心卖点
$sellingPoint`,
      variables: JSON.stringify([
        { name: "bookTitle", description: "书名", source: "book", required: true },
        { name: "bookGenre", description: "题材", source: "book", required: false },
        { name: "originalDescription", description: "原始简介", source: "book", required: true },
        { name: "sellingPoint", description: "核心卖点", source: "book", required: false },
        { name: "targetWords", description: "目标字数", source: "user_input", required: false },
        { name: "writingRules", description: "写作规则", source: "world_rules", required: false },
      ]),
    },
    {
      functionKey: "book_info_suggest",
      displayName: "书籍信息建议",
      description: "根据概念描述生成完整书籍信息",
      template: `你是一位资深网络小说策划。请根据用户提供的书籍概念，生成完整的书籍信息建议。

## 返回格式
以 JSON 格式返回，不要包含其他内容：

\`\`\`json
{
  "title": "建议书名",
  "genre": "题材大类",
  "subGenre": "子题材",
  "platform": "推荐发布平台",
  "targetAudience": "目标受众",
  "tags": ["标签1", "标签2", "标签3"],
  "writingStyle": "推荐文风",
  "targetWordCount": 3000,
  "targetTotalWords": 200,
  "referenceWorks": "参考作品",
  "sellingPoint": "核心卖点",
  "description": "书籍简介"
}
\`\`\`

## 格式约束
- 所有字段都必须填写
- 标签 3-5 个，每标签不超过 4 个字
- 简介控制在 150 字以内
- 核心卖点控制在 50 字以内

---

## 用户概念
$userConcept

## 已有信息（如有）
书名：$existingTitle
题材：$existingGenre`,
      variables: JSON.stringify([
        { name: "userConcept", description: "用户概念描述", source: "user_input", required: true },
        { name: "existingTitle", description: "已有书名", source: "book", required: false },
        { name: "existingGenre", description: "已有题材", source: "book", required: false },
      ]),
    },
    {
      functionKey: "world_rule_suggest",
      displayName: "世界规则建议",
      description: "根据书籍信息和描述生成世界规则",
      template: `你是一位资深网络小说世界观架构师。请根据书籍信息和用户描述，生成一套完整的世界规则建议。

## 返回格式
以 JSON 格式返回，不要包含其他内容：

\`\`\`json
{
  "global": [
    {"name": "规则名称", "content": "规则具体内容"}
  ],
  "writing": [
    {"name": "规则名称", "content": "规则具体内容"}
  ],
  "setting": [
    {"name": "规则名称", "content": "规则具体内容"}
  ]
}
\`\`\`

## 格式约束
- 分为三类：global（全局规则）、writing（写作规则）、setting（设定规则）
- 每条规则包含 name 和 content
- 全局规则 5-8 条，写作规则 3-5 条，设定规则 2-4 条
- 规则内容要具体可执行，不要太笼统
- 不要生成政治合规、审核相关的内容，这类规则由平台自动处理

---

## 书籍信息
书名：$bookTitle
题材：$bookGenre
卖点：$bookSellingPoint

## 用户描述
$userConcept

## 已有规则（如有）
$existingRules`,
      variables: JSON.stringify([
        { name: "bookTitle", description: "书名", source: "book", required: true },
        { name: "bookGenre", description: "题材", source: "book", required: false },
        { name: "bookSellingPoint", description: "核心卖点", source: "book", required: false },
        { name: "userConcept", description: "用户概念描述", source: "user_input", required: true },
        { name: "existingRules", description: "已有规则", source: "world_rules", required: false },
      ]),
    },
  ];

  const tx = db.transaction(() => {
    for (const s of seeds) {
      insert.run(randomUUID(), s.functionKey, s.displayName, s.description, s.template, s.variables, now, now);
    }
  });
  tx();
  _seeded = true;
}
