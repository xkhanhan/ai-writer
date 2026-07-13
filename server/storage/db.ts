import Database from "better-sqlite3";
import path from "path";
import { promises as fs } from "fs";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "novel-writer.db");

let db: Database.Database | null = null;

export async function getDb(): Promise<Database.Database> {
  if (db) return db;

  // 确保数据目录存在
  await fs.mkdir(DATA_DIR, { recursive: true });

  // 创建数据库连接
  db = new Database(DB_PATH);

  // 启用 WAL 模式提高性能
  db.pragma("journal_mode = WAL");

  // 启用外键约束，确保 ON DELETE CASCADE 生效
  db.pragma("foreign_keys = ON");

  // 初始化表结构
  initializeTables(db);

  // 迁移：为 books 表补充元信息列
  migrateBookMetadata(db);

  // 迁移：为 volumes 表补充 stages 列
  migrateVolumeStages(db);

  // 迁移：为 books 表补充目标总字数列
  migrateBookTargetTotalWords(db);

  // 迁移：为 chapters 表补充新字段
  migrateChapterNewFields(db);

  // 迁移：为 prompt_templates 表补充元信息列
  migratePromptTemplates(db);

  // 迁移：初始化系统默认提示词模板
  migrateDefaultPromptTemplates(db);

  return db;
}

// 迁移：为 books 表补充元信息列
function migrateBookMetadata(db: Database.Database) {
  const columns = db.prepare(`
    PRAGMA table_info(books)
  `).all() as Array<{ name: string }>;

  const existing = new Set(columns.map((c) => c.name));

  const newColumns: Array<{ name: string; def: string }> = [
    { name: "sub_genre", def: "TEXT NOT NULL DEFAULT ''" },
    { name: "tags", def: "TEXT NOT NULL DEFAULT ''" },
    { name: "writing_style", def: "TEXT NOT NULL DEFAULT ''" },
    { name: "narrative_pov", def: "TEXT NOT NULL DEFAULT ''" },
    { name: "target_audience", def: "TEXT NOT NULL DEFAULT ''" },
    { name: "target_word_count", def: "INTEGER DEFAULT 0" },
    { name: "ending_type", def: "TEXT NOT NULL DEFAULT ''" },
    { name: "reference_works", def: "TEXT NOT NULL DEFAULT ''" },
    { name: "selling_point", def: "TEXT NOT NULL DEFAULT ''" }
  ];

  for (const col of newColumns) {
    if (!existing.has(col.name)) {
      db.exec(`ALTER TABLE books ADD COLUMN ${col.name} ${col.def}`);
    }
  }
}

function migrateVolumeStages(db: Database.Database) {
  const columns = db.prepare("PRAGMA table_info(volumes)").all() as Array<{ name: string }>;
  const existing = new Set(columns.map((c) => c.name));
  if (!existing.has("stages")) {
    db.exec("ALTER TABLE volumes ADD COLUMN stages TEXT DEFAULT '[]'");
  }
}

function migrateBookTargetTotalWords(db: Database.Database) {
  const columns = db.prepare("PRAGMA table_info(books)").all() as Array<{ name: string }>;
  const existing = new Set(columns.map((c) => c.name));
  if (!existing.has("target_total_words")) {
    db.exec("ALTER TABLE books ADD COLUMN target_total_words INTEGER DEFAULT 0");
  }
}

function migrateChapterNewFields(db: Database.Database) {
  const columns = db.prepare("PRAGMA table_info(chapters)").all() as Array<{ name: string }>;
  const existing = new Set(columns.map((c) => c.name));
  const newColumns: Array<{ name: string; def: string }> = [
    { name: "prev_chapter_link", def: "TEXT DEFAULT ''" },
    { name: "next_chapter_suspense", def: "TEXT DEFAULT ''" },
    { name: "time", def: "TEXT DEFAULT ''" },
    { name: "mood_tone", def: "TEXT DEFAULT ''" },
  ];
  for (const col of newColumns) {
    if (!existing.has(col.name)) {
      db.exec(`ALTER TABLE chapters ADD COLUMN ${col.name} ${col.def}`);
    }
  }
}

/**
 * Migrate prompt_templates to allow nullable book_id (for system-level templates).
 * Drops and recreates the table since SQLite doesn't support ALTER COLUMN.
 * Existing data is preserved.
 */
function migratePromptTemplates(db: Database.Database) {
  const tableInfo = db.prepare(
    `SELECT sql FROM sqlite_master WHERE type='table' AND name='prompt_templates'`,
  ).get() as { sql: string } | undefined;

  if (!tableInfo) return; // table doesn't exist yet, will be created by initializeTables

  // Check if book_id is NOT NULL (old schema)
  if (!tableInfo.sql.includes("NOT NULL")) return; // already migrated

  // Rebuild the table with nullable book_id
  db.exec(`
    CREATE TABLE prompt_templates_new (
      id            TEXT PRIMARY KEY,
      book_id       TEXT,
      function_key  TEXT NOT NULL,
      display_name  TEXT NOT NULL,
      description   TEXT DEFAULT '',
      template      TEXT NOT NULL,
      variables     TEXT DEFAULT '[]',
      is_default    INTEGER DEFAULT 0,
      is_active     INTEGER DEFAULT 1,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );
    INSERT INTO prompt_templates_new (id, book_id, function_key, display_name, description, template, variables, is_default, is_active, created_at, updated_at)
      SELECT id, book_id, function_key, display_name, description, template, variables, is_default, is_active, created_at, updated_at
      FROM prompt_templates;
    DROP TABLE prompt_templates;
    ALTER TABLE prompt_templates_new RENAME TO prompt_templates;
    CREATE INDEX IF NOT EXISTS idx_prompt_func ON prompt_templates(book_id, function_key);
    CREATE INDEX IF NOT EXISTS idx_prompt_func_key ON prompt_templates(function_key);
  `);
}

function initializeTables(db: Database.Database) {
  // 创建书籍表
  db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      genre TEXT NOT NULL,
      platform TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // 创建书籍选项表
  db.exec(`
    CREATE TABLE IF NOT EXISTS book_options (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // 创建文件夹表
  db.exec(`
    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      book_id TEXT NOT NULL,
      category TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // 创建文件表
  db.exec(`
    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      content TEXT DEFAULT '',
      folder_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE
    )
  `);

  // 创建索引
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_books_updated_at ON books(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_folders_book_category ON folders(book_id, category);
    CREATE INDEX IF NOT EXISTS idx_files_folder_id ON files(folder_id);
  `);

  // 创作区 - 卷纲
  db.exec(`
    CREATE TABLE IF NOT EXISTS volumes (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL,
      title TEXT NOT NULL,
      core_conflict TEXT DEFAULT '',
      development_arc TEXT DEFAULT '',
      key_points TEXT DEFAULT '[]',
      highlights TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_volumes_book_id ON volumes(book_id);
  `);

  // 创作区 - 章纲
  db.exec(`
    CREATE TABLE IF NOT EXISTS chapters (
      id TEXT PRIMARY KEY,
      volume_id TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT DEFAULT '',
      scenes TEXT DEFAULT '[]',
      characters TEXT DEFAULT '[]',
      key_events TEXT DEFAULT '[]',
      foreshadowings TEXT DEFAULT '[]',
      highlights TEXT DEFAULT '',
      expected_words INTEGER DEFAULT 3000,
      note TEXT DEFAULT '',
      content TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      status TEXT DEFAULT 'planned',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (volume_id) REFERENCES volumes(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_chapters_volume_id ON chapters(volume_id);
    CREATE INDEX IF NOT EXISTS idx_chapters_volume_sort ON chapters(volume_id, sort_order);
  `);

  // 创作区 - 总纲（每本书一条）
  db.exec(`
    CREATE TABLE IF NOT EXISTS book_outlines (
      book_id TEXT PRIMARY KEY,
      direction TEXT DEFAULT '',
      stages TEXT DEFAULT '',
      selling_points TEXT DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    );
  `);

  // 世界规则
  db.exec(`
    CREATE TABLE IF NOT EXISTS world_rules (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL,
      category TEXT NOT NULL,
      name TEXT NOT NULL,
      content TEXT DEFAULT '',
      is_fixed INTEGER DEFAULT 0,
      setting_type TEXT DEFAULT '',
      select_options TEXT DEFAULT '[]',
      number_min REAL,
      number_max REAL,
      number_unit TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_world_rules_book_category ON world_rules(book_id, category);
    CREATE INDEX IF NOT EXISTS idx_world_rules_sort ON world_rules(book_id, sort_order);
  `);

  // 正文库 - 存稿
  db.exec(`
    CREATE TABLE IF NOT EXISTS archived_chapters (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL,
      chapter_id TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      title TEXT NOT NULL,
      content TEXT DEFAULT '',
      word_count INTEGER DEFAULT 0,
      archived_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_archive_book_id ON archived_chapters(book_id);
  `);

  // 标签分类（系统标签库）
  db.exec(`
    CREATE TABLE IF NOT EXISTS tag_categories (
      id          TEXT PRIMARY KEY,
      book_id     TEXT NOT NULL,
      parent_id   TEXT,
      name        TEXT NOT NULL,
      code        TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      sort_order  INTEGER DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_tag_categories_book_id ON tag_categories(book_id);
    CREATE INDEX IF NOT EXISTS idx_tag_categories_parent_id ON tag_categories(parent_id);
  `);

  // 事实一致性库
  db.exec(`
    CREATE TABLE IF NOT EXISTS story_facts (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL,
      chapter_id TEXT DEFAULT '',
      chapter_number INTEGER DEFAULT 0,
      content TEXT DEFAULT '',
      related_character_ids TEXT DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_story_facts_book_id ON story_facts(book_id);
  `);

  // 设定库 - 设定实体
  db.exec(`
    CREATE TABLE IF NOT EXISTS setting_entities (
      id              TEXT PRIMARY KEY,
      book_id         TEXT NOT NULL,
      category        TEXT NOT NULL,
      name            TEXT NOT NULL,
      level           TEXT NOT NULL DEFAULT 'general',
      description     TEXT NOT NULL DEFAULT '',
      appearance      TEXT NOT NULL DEFAULT '',
      traits          TEXT NOT NULL DEFAULT '',
      background      TEXT NOT NULL DEFAULT '',
      abilities       TEXT NOT NULL DEFAULT '',
      weaknesses      TEXT NOT NULL DEFAULT '',
      tag_ids         TEXT NOT NULL DEFAULT '[]',
      category_fields TEXT NOT NULL DEFAULT '{}',
      status_fields   TEXT NOT NULL DEFAULT '{}',
      deprecated      INTEGER NOT NULL DEFAULT 0,
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_setting_entities_book_category ON setting_entities(book_id, category);
    CREATE INDEX IF NOT EXISTS idx_setting_entities_book_level ON setting_entities(book_id, level);
  `);

  // AI 生成会话记录
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_generation_sessions (
      id                  TEXT PRIMARY KEY,
      book_id             TEXT NOT NULL,
      function_key        TEXT NOT NULL,
      chapter_id          TEXT,
      prompt_template_id  TEXT,
      input_context       TEXT DEFAULT '',
      user_input          TEXT DEFAULT '',
      raw_output          TEXT DEFAULT '',
      adopted             INTEGER DEFAULT 0,
      model               TEXT DEFAULT '',
      tokens_input        INTEGER DEFAULT 0,
      tokens_output       INTEGER DEFAULT 0,
      latency_ms          INTEGER DEFAULT 0,
      created_at          TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_gen_sessions_book ON ai_generation_sessions(book_id);
    CREATE INDEX IF NOT EXISTS idx_gen_sessions_chapter ON ai_generation_sessions(chapter_id);
  `);

  // AI 提示词模板（system-level: book_id IS NULL; book-specific: book_id = bookId）
  db.exec(`
    CREATE TABLE IF NOT EXISTS prompt_templates (
      id            TEXT PRIMARY KEY,
      book_id       TEXT,
      function_key  TEXT NOT NULL,
      display_name  TEXT NOT NULL,
      description   TEXT DEFAULT '',
      template      TEXT NOT NULL,
      variables     TEXT DEFAULT '[]',
      is_default    INTEGER DEFAULT 0,
      is_active     INTEGER DEFAULT 1,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_prompt_func ON prompt_templates(book_id, function_key);
    CREATE INDEX IF NOT EXISTS idx_prompt_func_key ON prompt_templates(function_key);
  `);

  // 伏笔库
  db.exec(`
    CREATE TABLE IF NOT EXISTS foreshadows (
      id              TEXT PRIMARY KEY,
      book_id         TEXT NOT NULL,
      name            TEXT NOT NULL,
      description     TEXT DEFAULT '',
      status          TEXT NOT NULL DEFAULT 'hidden',
      chapter_id      TEXT DEFAULT '',
      chapter_number  INTEGER,
      volume_id       TEXT DEFAULT '',
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_foreshadows_book_id ON foreshadows(book_id);
    CREATE INDEX IF NOT EXISTS idx_foreshadows_status ON foreshadows(book_id, status);
  `);
}

/**
 * 迁移：初始化系统默认提示词模板
 * 只在数据库中没有系统默认模板时插入
 */
function migrateDefaultPromptTemplates(db: Database.Database) {
  // 检查是否已有系统默认模板
  const existing = db.prepare(
    `SELECT COUNT(*) as count FROM prompt_templates WHERE book_id IS NULL AND is_default = 1`
  ).get() as { count: number };

  if (existing.count > 0) return; // 已有默认模板，跳过

  const now = new Date().toISOString();
  const insertStmt = db.prepare(
    `INSERT INTO prompt_templates (id, book_id, function_key, display_name, description, template, variables, is_default, is_active, created_at, updated_at)
     VALUES (?, NULL, ?, ?, ?, ?, ?, 1, 0, ?, ?)`
  );

  const defaultTemplates = [
    {
      functionKey: "content_generate",
      displayName: "正文生成",
      description: "根据章纲信息生成小说正文",
      template: `你是一位专注于网络小说创作的资深作家。请根据以下章纲信息撰写正文。

## 输出格式
- 直接输出正文，不加标题、注释或总结
- 目标字数：\${expectedWords} 字（允许 ±15%）

---

## 书籍信息
书名：\${bookTitle}
题材：\${bookGenre}
写作风格：\${bookStyle}

## 世界规则
\${worldRules}

## 写作规则
\${writingRules}

## 章纲信息
标题：\${chapterTitle}
摘要：\${chapterSummary}
场景：\${chapterScenes}
出场人物：\${chapterCharacters}
重要事件：\${chapterKeyEvents}

## 角色档案
\${characterProfiles}

## 事实记录
\${facts}

## 活跃伏笔
\${foreshadows}

## 前文衔接
\${previousEnding}`,
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
      functionKey: "outline_optimize",
      displayName: "总纲优化",
      description: "优化故事总纲的方向、阶段划分和核心卖点",
      template: `## 输出要求
以 JSON 格式返回优化建议，不要包含其他内容：

\`\`\`json
{
  "diagnosis": {
    "direction": "对整体方向的诊断评价（1-2句话）",
    "stages": "对阶段划分的诊断评价（1-2句话）",
    "sellingPoints": "对核心卖点的诊断评价（1-2句话）"
  },
  "optimized": {
    "direction": "优化后的整体方向",
    "stages": "优化后的阶段划分",
    "sellingPoints": "优化后的核心卖点"
  },
  "suggestions": ["建议1", "建议2", "建议3"]
}
\`\`\`

## 格式约束
- diagnosis 为诊断评价，指出当前内容的问题或亮点
- optimized 为优化后的内容
- suggestions 为 1-3 条额外建议
- 如果某个字段当前为空（"尚未填写"），则由你根据书籍信息补全

---

你是一位资深网络小说策划编辑。请根据当前总纲内容和书籍信息，对总纲进行诊断和优化。

## 书籍信息
书名：\${bookTitle}
题材：\${bookGenre}
风格：\${bookStyle}

## 当前总纲
整体方向：\${currentDirection}
阶段划分：\${currentStages}
核心卖点：\${currentSellingPoints}

## 补充说明
\${userInstruction}`,
      variables: JSON.stringify([
        { name: "bookTitle", description: "书名", source: "book", required: true },
        { name: "bookGenre", description: "题材", source: "book", required: false },
        { name: "bookStyle", description: "写作风格", source: "book", required: false },
        { name: "currentDirection", description: "当前整体方向", source: "outline", required: false },
        { name: "currentStages", description: "当前阶段划分", source: "outline", required: false },
        { name: "currentSellingPoints", description: "当前核心卖点", source: "outline", required: false },
        { name: "userInstruction", description: "用户补充说明", source: "user_input", required: false },
      ]),
    },
    {
      functionKey: "volume_generate",
      displayName: "卷纲生成",
      description: "根据总纲和已有卷纲，为当前卷生成核心冲突、发展弧线和看点",
      template: `## 输出要求
以 JSON 格式返回，不要包含其他内容：

\`\`\`json
{
  "coreConflict": "本卷的核心矛盾冲突（1-3句话）",
  "developmentArc": "情节发展走向，从本卷起点到终点（3-5句话）",
  "highlights": "本卷吸引读者继续阅读的钩子（2-3个要点）"
}
\`\`\`

## 格式约束
- coreConflict 是本卷的主要矛盾，要具体、有张力
- developmentArc 描述情节起伏，要有节奏感
- highlights 是读者读完本卷后会期待下一卷的理由
- 必须与总纲方向一致，与前序卷纲衔接连贯
- 如果用户指定了卷标题，围绕标题设计内容

---

你是一位资深网络小说策划编辑。请根据总纲和已有卷纲信息，为当前卷生成卷纲。

## 书籍信息
书名：\${bookTitle}
题材：\${bookGenre}
风格：\${bookStyle}

## 总纲
整体方向：\${outlineDirection}
阶段划分：\${outlineStages}
核心卖点：\${outlineSellingPoints}

## 已有卷纲（保持连贯）
\${previousVolumes}

## 当前卷信息
卷标题：\${currentVolumeTitle}
用户已填内容：
核心冲突：\${currentVolumeConflict}
发展弧线：\${currentVolumeArc}
看点：\${currentVolumeHighlights}

## 补充说明
\${userInstruction}`,
      variables: JSON.stringify([
        { name: "bookTitle", description: "书名", source: "book", required: true },
        { name: "bookGenre", description: "题材", source: "book", required: false },
        { name: "bookStyle", description: "写作风格", source: "book", required: false },
        { name: "outlineDirection", description: "总纲-整体方向", source: "outline", required: false },
        { name: "outlineStages", description: "总纲-阶段划分", source: "outline", required: false },
        { name: "outlineSellingPoints", description: "总纲-核心卖点", source: "outline", required: false },
        { name: "previousVolumes", description: "前序卷纲摘要", source: "volumes", required: false },
        { name: "currentVolumeTitle", description: "当前卷标题", source: "volume", required: false },
        { name: "currentVolumeConflict", description: "当前卷核心冲突（已填）", source: "volume", required: false },
        { name: "currentVolumeArc", description: "当前卷发展弧线（已填）", source: "volume", required: false },
        { name: "currentVolumeHighlights", description: "当前卷看点（已填）", source: "volume", required: false },
        { name: "userInstruction", description: "用户补充说明", source: "user_input", required: false },
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
书名：\${bookTitle}
题材：\${bookGenre}

## 写作规则
\${writingRules}

## 目标字数
\${targetWords}

## 章节上下文
\${chapterContext}

## 原文
\${selectedText}`,
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
书名：\${bookTitle}
题材：\${bookGenre}

## 写作规则
\${writingRules}

## 目标字数
\${targetWords}

## 章节上下文
\${chapterContext}

## 原文
\${selectedText}`,
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
- 扩写到约 \${targetWords} 字

---

## 书籍信息
书名：\${bookTitle}
题材：\${bookGenre}

## 写作规则
\${writingRules}

## 背景
\${chapterContext}

## 原文片段
\${selectedText}`,
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
\${characterProfile}

## 世界规则
\${worldRules}

## 相关事实记录
\${facts}

## 已写章节中该角色出现的片段
\${characterAppearances}`,
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
\${worldRules}

## 角色设定
\${characterSettings}

## 事实记录
\${facts}`,
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
- 控制在 \${targetWords} 字以内
- 适合在小说平台展示

---

## 书籍信息
书名：\${bookTitle}
题材：\${bookGenre}

## 写作规则
\${writingRules}

## 原始简介
\${originalDescription}

## 核心卖点
\${sellingPoint}`,
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
\${userConcept}

## 已有信息（如有）
书名：\${existingTitle}
题材：\${existingGenre}`,
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
书名：\${bookTitle}
题材：\${bookGenre}
卖点：\${bookSellingPoint}

## 用户描述
\${userConcept}

## 已有规则（如有）
\${existingRules}`,
      variables: JSON.stringify([
        { name: "bookTitle", description: "书名", source: "book", required: true },
        { name: "bookGenre", description: "题材", source: "book", required: false },
        { name: "bookSellingPoint", description: "核心卖点", source: "book", required: false },
        { name: "userConcept", description: "用户概念描述", source: "user_input", required: true },
        { name: "existingRules", description: "已有规则", source: "world_rules", required: false },
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
\${chapterInfo}

## 正文内容
\${chapterContent}

## 现有角色设定
\${existingCharacters}

## 现有伏笔
\${existingForeshadows}`,
      variables: JSON.stringify([
        { name: "chapterInfo", description: "章纲信息", source: "chapter", required: false },
        { name: "chapterContent", description: "正文内容", source: "chapter_content", required: true },
        { name: "existingCharacters", description: "现有角色设定", source: "settings", required: false },
        { name: "existingForeshadows", description: "现有伏笔", source: "foreshadows", required: false },
      ]),
    },
  ];

  const tx = db.transaction(() => {
    for (const t of defaultTemplates) {
      insertStmt.run(
        crypto.randomUUID(),
        t.functionKey,
        t.displayName,
        t.description,
        t.template,
        t.variables,
        now,
        now,
      );
    }
  });
  tx();

  console.log(`[db] 已插入 ${defaultTemplates.length} 个系统默认提示词模板`);
}


