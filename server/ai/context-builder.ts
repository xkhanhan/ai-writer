/**
 * ContextBuilder — multi-stage prompt assembly pipeline for AI features.
 *
 * Stages:
 *   1. Data Collection   — load raw data from DB stores
 *   2. Data Processing   — filter, sort, derive display strings
 *   3. Knowledge Injection — (placeholder for examples / writing guides)
 *   4. Template Rendering — $variable replacement in prompt templates
 *   5. Final Assembly     — system prompt + user prompt + token estimate
 */

import { getBookById } from "@/server/storage/book-store";
import {
  getVolumesByBookId,
  getChapterById,
  getChaptersByVolumeId,
} from "@/server/storage/outline-store";
import { getWorldRulesByBookId } from "@/server/storage/world-rule-store";
import { getSettingEntitiesByBookId } from "@/server/storage/setting-entity-store";
import { getStoryFactsByBookId } from "@/server/storage/fact-store";
import { getActivePromptTemplate } from "@/server/storage/prompt-template-store";
import type { Book } from "@/server/storage/book-store";
import type {
  ChapterOutline,
  SettingEntity,
  StoryFact,
  WorldRule,
} from "@/shared/types";

// ============================================================================
// Types
// ============================================================================

export type AiFunctionKey =
  | "content_generate"
  | "review_extract"
  | "polish"
  | "deslop"
  | "expand"
  | "character_audit"
  | "fact_consistency"
  | "book_synopsis_expand"
  | "book_info_suggest";

export interface ContextInput {
  bookId: string;
  chapterId?: string;
  characterId?: string;
  functionKey: AiFunctionKey;
  selectedText?: string;
  extraVariables?: Record<string, string>;
}

export interface BuiltContext {
  systemPrompt: string;
  userPrompt: string;
  functionKey: AiFunctionKey;
  estimatedTokens: number;
  metadata: {
    bookTitle: string;
    chapterTitle?: string;
    charactersInvolved?: string[];
    factsCount?: number;
  };
}

// ============================================================================
// 1. Default Prompt Templates
// ============================================================================

const DEFAULT_TEMPLATES: Record<string, string> = {
  content_generate: `你是一位专注于网络小说创作的资深作家。请根据以下章纲信息撰写正文。

## 写作要求
- 严格按照章纲的场景和事件展开
- 人物言行符合设定，不可 OOC
- 遵守所有世界规则和写作规则
- 不使用现代网络用语和 AI 常见表达
- 目标字数：$expectedWords 字（允许 ±15%）
- 直接输出正文，不加标题、注释或总结

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

  review_extract: `你是一位小说数据提取专家。请从以下正文中提取结构化信息。

## 提取要求
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

## 章纲信息
$chapterInfo

## 正文内容
$chapterContent

## 现有角色设定
$existingCharacters

## 现有伏笔
$existingForeshadows`,

  polish: `你是一位资深网文编辑。请对以下文本进行润色：
- 提升文字的表现力和感染力
- 优化句式结构，让阅读更流畅
- 保持原文风格和情节不变
- 保持字数大致不变（±10%）

## 书籍信息
书名：$bookTitle
题材：$bookGenre

## 写作规则
$writingRules

## 原文
$selectedText`,

  deslop: `你是一位经验丰富的网文编辑。请对以下文本进行"去AI味"处理：

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

## 要求
- 保持原文情节和信息不变
- 保持字数大致不变（±10%）

## 原文
$selectedText`,

  expand: `你是一位资深网络小说作家。请对以下片段进行扩写：
- 在保持原有情节的基础上丰富细节
- 增加环境描写、心理活动、对话等
- 保持原文风格一致
- 扩写到约 $targetWords 字

## 书籍信息
书名：$bookTitle
题材：$bookGenre

## 背景
$chapterContext

## 原文片段
$selectedText`,

  character_audit: `你是一位小说角色一致性审查专家。请检查以下角色在已写章节中的表现是否符合设定。

## 审查要求
- 对比角色实际行为与角色设定
- 标注 OOC（Out of Character）片段
- 检查能力边界是否合理
- 检查人际关系是否连贯
- 给出修改建议

## 角色设定
$characterProfile

## 世界规则
$worldRules

## 相关事实记录
$facts

## 已写章节中该角色出现的片段
$characterAppearances`,

  fact_consistency: `你是一位小说事实一致性检查专家。请对已记录的事实进行交叉验证。

## 检查要求
- 检查事实之间是否存在矛盾
- 检查事实是否与世界规则冲突
- 标注时间线不一致的问题
- 标注角色信息不一致的问题
- 给出修复建议

## 世界规则
$worldRules

## 角色设定
$characterSettings

## 事实记录
$facts`,

  book_synopsis_expand: `你是一位资深网络小说策划。请对以下书籍简介进行扩写：

## 要求
- 在保持核心卖点不变的前提下丰富细节
- 增加悬念和吸引力
- 控制在 $targetWords 字以内
- 适合在小说平台展示

## 书籍信息
书名：$bookTitle
题材：$bookGenre
原始简介：$originalDescription
核心卖点：$sellingPoint`,

  book_info_suggest: `你是一位资深网络小说策划。请根据用户提供的书籍概念，生成完整的书籍信息建议。

## 要求
- 以 JSON 格式返回，不要包含其他内容
- 所有字段都必须填写
- 标签 3-5 个，每标签不超过 4 个字
- 简介控制在 150 字以内
- 核心卖点控制在 50 字以内

## 返回格式
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

## 用户概念
$userConcept

## 已有信息（如有）
书名：$existingTitle
题材：$existingGenre`,
};

// ============================================================================
// 2. Utility Helpers
// ============================================================================

/**
 * Rough token estimation.
 * CJK characters ≈ 1 token per 3 chars; Latin/other ≈ 1 token per 4 chars.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;

  let cjkCount = 0;
  let otherCount = 0;

  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    // CJK Unified Ideographs + Extensions + Compatibility Ideographs
    if (code >= 0x4e00 && code <= 0x9fff) {
      cjkCount++;
    } else if (code >= 0x3400 && code <= 0x4dbf) {
      cjkCount++;
    } else if (code >= 0xf900 && code <= 0xfaff) {
      cjkCount++;
    } else if (code >= 0x20000 && code <= 0x2fa1f) {
      cjkCount++;
    } else {
      otherCount++;
    }
  }

  return Math.ceil(cjkCount / 3 + otherCount / 4);
}

/**
 * Replace $variable placeholders with values from the map.
 * Array values are joined with newlines for readability.
 */
export function renderTemplate(
  template: string,
  variables: Record<string, string>,
): string {
  return template.replace(/\$(\w+)/g, (_match, name: string) => {
    if (name in variables) {
      return variables[name];
    }
    // Leave unrecognized placeholders as-is
    return `$${name}`;
  });
}

/** Format a rules array into a numbered list string. */
function formatRules(rules: WorldRule[]): string {
  if (rules.length === 0) return "（无）";
  return rules.map((r, i) => `${i + 1}. [${r.name}] ${r.content}`).join("\n");
}

/** Format setting entities (characters) into readable profiles. */
function formatCharacterProfiles(entities: SettingEntity[]): string {
  if (entities.length === 0) return "（无角色设定）";
  return entities
    .map((e) => {
      const parts: string[] = [`### ${e.name}（${e.level}）`];
      if (e.description) parts.push(`描述：${e.description}`);
      if (e.appearance) parts.push(`外貌：${e.appearance}`);
      if (e.traits) parts.push(`性格：${e.traits}`);
      if (e.background) parts.push(`背景：${e.background}`);
      if (e.abilities) parts.push(`能力：${e.abilities}`);
      if (e.weaknesses) parts.push(`弱点：${e.weaknesses}`);
      // Include custom category fields
      const cfEntries = Object.entries(e.categoryFields);
      if (cfEntries.length > 0) {
        for (const [k, v] of cfEntries) {
          if (v) parts.push(`${k}：${v}`);
        }
      }
      return parts.join("\n");
    })
    .join("\n\n");
}

/** Format facts into a readable list. */
function formatFacts(facts: StoryFact[]): string {
  if (facts.length === 0) return "（无事实记录）";
  return facts
    .map((f) => `第${f.chapterNumber}章：${f.content}`)
    .join("\n");
}

/** Format a simple fact list for the character audit view. */
function formatFactList(facts: StoryFact[]): string {
  if (facts.length === 0) return "（无相关事实记录）";
  return facts.map((f) => `- 第${f.chapterNumber}章：${f.content}`).join("\n");
}

/** Format setting entities for the fact consistency cross-reference. */
function formatCharacterSettings(entities: SettingEntity[]): string {
  if (entities.length === 0) return "（无角色设定）";
  return entities
    .map((e) => {
      const parts: string[] = [`### ${e.name}`];
      if (e.description) parts.push(`描述：${e.description}`);
      if (e.traits) parts.push(`性格：${e.traits}`);
      if (e.abilities) parts.push(`能力：${e.abilities}`);
      if (e.weaknesses) parts.push(`弱点：${e.weaknesses}`);
      return parts.join("\n");
    })
    .join("\n\n");
}

// ============================================================================
// 3. Data Collection Helpers
// ============================================================================

/** Ensure the book exists or throw. */
async function requireBook(bookId: string): Promise<Book> {
  const book = await getBookById(bookId);
  if (!book) {
    throw new Error(`书籍不存在（bookId: ${bookId}）`);
  }
  return book;
}

/** Ensure the chapter exists or throw. */
async function requireChapter(chapterId: string): Promise<ChapterOutline> {
  const chapter = await getChapterById(chapterId);
  if (!chapter) {
    throw new Error(`章纲不存在（chapterId: ${chapterId}）`);
  }
  return chapter;
}

/**
 * Find the chapter that comes immediately before `currentChapter`
 * by walking its volume's chapter list.
 */
async function findPreviousChapter(
  currentChapter: ChapterOutline,
): Promise<ChapterOutline | null> {
  const siblings = await getChaptersByVolumeId(currentChapter.volumeId);
  // Chapters are returned sorted by sort_order ASC
  const idx = siblings.findIndex((c) => c.id === currentChapter.id);
  if (idx <= 0) return null;
  return siblings[idx - 1];
}

/** Extract the last N characters of chapter content as a "previous ending". */
function extractEnding(content: string, maxLen = 500): string {
  if (!content) return "（无前文内容）";
  const trimmed = content.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `…\n${trimmed.slice(-maxLen)}`;
}

// ============================================================================
// 4. Stage Implementations
// ============================================================================

// ---------- content_generate ----------

async function buildContentGenerationContext(
  input: ContextInput,
): Promise<BuiltContext> {
  const book = await requireBook(input.bookId);
  const chapter = await requireChapter(input.chapterId!);

  // Gather related chapter-level data
  const allChapters = await getChaptersByVolumeId(chapter.volumeId);
  const chapterNumber =
    allChapters.findIndex((c) => c.id === chapter.id) + 1;

  // World rules — global + writing categories
  const [globalRules, writingRules] = await Promise.all([
    getWorldRulesByBookId(book.id, "global"),
    getWorldRulesByBookId(book.id, "writing"),
  ]);

  // Setting entities that appear in this chapter
  const chapterCharacterNames = new Set(chapter.characters);
  const allCharacters = await getSettingEntitiesByBookId(
    book.id,
    "character",
  );
  const involvedCharacters = allCharacters.filter((c) =>
    chapterCharacterNames.has(c.name),
  );
  // If no names match, include all core + important characters as fallback
  const displayCharacters =
    involvedCharacters.length > 0
      ? involvedCharacters
      : allCharacters.filter(
          (c) => c.level === "core" || c.level === "important",
        );

  // Facts up to this chapter number (exclude current chapter's own facts)
  const allFacts = await getStoryFactsByBookId(book.id);
  const relevantFacts = allFacts.filter(
    (f) => f.chapterNumber > 0 && f.chapterNumber < chapterNumber,
  );

  // Foreshadows — from the chapter outline's foreshadowings string array
  const foreshadowList =
    chapter.foreshadowings.length > 0
      ? chapter.foreshadowings.map((f) => `- ${f}`).join("\n")
      : "（无活跃伏笔）";

  // Previous chapter ending
  const prevChapter = await findPreviousChapter(chapter);
  let previousEnding = "（第一章，无前文）";
  if (prevChapter?.content) {
    previousEnding = extractEnding(prevChapter.content);
  } else if (prevChapter) {
    // Previous chapter exists but has no written content yet
    previousEnding = `上一章「${prevChapter.title}」摘要：${prevChapter.summary || "暂无"}`;
  }

  // Stage 3: Knowledge injection placeholder
  // (No extra examples or writing guides injected yet.)

  // Stage 4: Load active prompt template (or fall back to default)
  const activeTemplate = await getActivePromptTemplate(
    book.id,
    "content_generate",
  );
  const template = activeTemplate?.template ?? DEFAULT_TEMPLATES.content_generate;

  // Build variable map
  const variables: Record<string, string> = {
    bookTitle: book.title,
    bookGenre: book.genre,
    bookStyle: book.writingStyle || "未设置",
    worldRules: formatRules(globalRules),
    writingRules: formatRules(writingRules),
    chapterTitle: chapter.title,
    chapterSummary: chapter.summary || "（无摘要）",
    chapterScenes: chapter.scenes.length > 0 ? chapter.scenes.map((s) => `- ${s}`).join("\n") : "（无场景）",
    chapterCharacters: chapter.characters.length > 0 ? chapter.characters.join("、") : "（无角色）",
    chapterKeyEvents: chapter.keyEvents.length > 0 ? chapter.keyEvents.map((e) => `- ${e}`).join("\n") : "（无事件）",
    characterProfiles: formatCharacterProfiles(displayCharacters),
    facts: formatFacts(relevantFacts),
    foreshadows: foreshadowList,
    previousEnding,
    expectedWords: String(chapter.expectedWords || 3000),
    // Allow caller overrides
    ...input.extraVariables,
  };

  // Stage 5: Render and assemble
  const userPrompt = renderTemplate(template, variables);
  const systemPrompt =
    "你是一位专业的网络小说作家助手。严格按照用户提供的章纲和规则进行创作，不要自行添加章纲以外的情节。";

  const fullText = systemPrompt + "\n\n" + userPrompt;
  const estimatedTokens = estimateTokens(fullText);

  if (estimatedTokens > 8000) {
    console.warn(
      `[ContextBuilder] content_generate token estimate (${estimatedTokens}) exceeds 8000 — proceeding.`,
    );
  }

  return {
    systemPrompt,
    userPrompt,
    functionKey: input.functionKey,
    estimatedTokens,
    metadata: {
      bookTitle: book.title,
      chapterTitle: chapter.title,
      charactersInvolved: displayCharacters.map((c) => c.name),
      factsCount: relevantFacts.length,
    },
  };
}

// ---------- review_extract ----------

async function buildReviewContext(
  input: ContextInput,
): Promise<BuiltContext> {
  const book = await requireBook(input.bookId);
  const chapter = await requireChapter(input.chapterId!);

  // Load chapter number for fact reference
  const allChapters = await getChaptersByVolumeId(chapter.volumeId);
  const chapterNumber =
    allChapters.findIndex((c) => c.id === chapter.id) + 1;

  // Existing characters (for reference)
  const allCharacters = await getSettingEntitiesByBookId(
    book.id,
    "character",
  );

  // Existing foreshadows (from all chapters in this volume)
  const allChaptersInVolume = await getChaptersByVolumeId(
    chapter.volumeId,
  );
  const foreshadowSet = new Set<string>();
  for (const ch of allChaptersInVolume) {
    // Only include foreshadows from chapters before or equal to the current one
    const chIdx = allChaptersInVolume.indexOf(ch);
    if (chIdx <= allChapters.findIndex((c) => c.id === chapter.id)) {
      for (const f of ch.foreshadowings) {
        foreshadowSet.add(f);
      }
    }
  }

  // Active template
  const activeTemplate = await getActivePromptTemplate(
    book.id,
    "review_extract",
  );
  const template = activeTemplate?.template ?? DEFAULT_TEMPLATES.review_extract;

  // Variables
  const chapterInfo = [
    `标题：${chapter.title}`,
    `摘要：${chapter.summary || "（无）"}`,
    `场景：${chapter.scenes.join("、") || "（无）"}`,
    `出场人物：${chapter.characters.join("、") || "（无）"}`,
    `重要事件：${chapter.keyEvents.join("、") || "（无）"}`,
    `章号：第${chapterNumber}章`,
  ].join("\n");

  const variables: Record<string, string> = {
    chapterInfo,
    chapterContent: chapter.content || "（暂无正文内容，请先生成正文后再提取）",
    existingCharacters:
      allCharacters.length > 0
        ? allCharacters.map((c) => `- ${c.name}（${c.level}）：${c.description || "无描述"}`).join("\n")
        : "（无角色设定）",
    existingForeshadows:
      foreshadowSet.size > 0
        ? [...foreshadowSet].map((f) => `- ${f}`).join("\n")
        : "（无伏笔记录）",
    ...input.extraVariables,
  };

  const userPrompt = renderTemplate(template, variables);
  const systemPrompt =
    "你是一位小说数据提取专家。只输出 JSON，不要添加任何解释文字。";

  const fullText = systemPrompt + "\n\n" + userPrompt;
  const estimatedTokens = estimateTokens(fullText);

  return {
    systemPrompt,
    userPrompt,
    functionKey: input.functionKey,
    estimatedTokens,
    metadata: {
      bookTitle: book.title,
      chapterTitle: chapter.title,
    },
  };
}

// ---------- polish / deslop / expand ----------

async function buildTextProcessingContext(
  input: ContextInput,
): Promise<BuiltContext> {
  const book = await requireBook(input.bookId);

  // Load writing rules for polish; simpler for deslop/expand
  const writingRules = await getWorldRulesByBookId(book.id, "writing");

  // Chapter context for expand (if chapterId provided)
  let chapterContext = "（无章纲上下文）";
  if (input.chapterId) {
    const chapter = await getChapterById(input.chapterId);
    if (chapter) {
      chapterContext = [
        `标题：${chapter.title}`,
        `摘要：${chapter.summary || ""}`,
        `场景：${chapter.scenes.join("、")}`,
        `事件：${chapter.keyEvents.join("、")}`,
      ].join("\n");
    }
  }

  const activeTemplate = await getActivePromptTemplate(
    book.id,
    input.functionKey,
  );
  const template =
    activeTemplate?.template ?? DEFAULT_TEMPLATES[input.functionKey] ?? "";

  const variables: Record<string, string> = {
    bookTitle: book.title,
    bookGenre: book.genre,
    writingRules: formatRules(writingRules),
    selectedText: input.selectedText || "（未提供选中文本）",
    targetWords: String(input.extraVariables?.targetWords ?? 2000),
    chapterContext,
    ...input.extraVariables,
  };

  const userPrompt = renderTemplate(template, variables);
  const systemPrompt =
    "你是一位专业的网文编辑。请严格按照要求对文本进行处理，保持原文核心内容不变。";

  const fullText = systemPrompt + "\n\n" + userPrompt;
  const estimatedTokens = estimateTokens(fullText);

  return {
    systemPrompt,
    userPrompt,
    functionKey: input.functionKey,
    estimatedTokens,
    metadata: {
      bookTitle: book.title,
    },
  };
}

// ---------- character_audit ----------

async function buildCharacterAuditContext(
  input: ContextInput,
): Promise<BuiltContext> {
  const book = await requireBook(input.bookId);

  // Load the specific character
  if (!input.characterId) {
    throw new Error("character_audit 需要提供 characterId");
  }
  const allEntities = await getSettingEntitiesByBookId(book.id);
  const character = allEntities.find((e) => e.id === input.characterId);
  if (!character) {
    throw new Error(`角色不存在（characterId: ${input.characterId}）`);
  }

  // World rules (global + writing)
  const [globalRules, writingRules] = await Promise.all([
    getWorldRulesByBookId(book.id, "global"),
    getWorldRulesByBookId(book.id, "writing"),
  ]);

  // Facts related to this character
  const allFacts = await getStoryFactsByBookId(book.id);
  const relatedFacts = allFacts.filter((f) =>
    f.relatedCharacterIds.includes(character.id),
  );

  // Gather appearances from chapter content
  const allVolumes = await getVolumesByBookId(book.id);
  const appearances: string[] = [];
  for (const vol of allVolumes) {
    const chapters = await getChaptersByVolumeId(vol.id);
    for (const ch of chapters) {
      if (!ch.content) continue;
      // Simple heuristic: find paragraphs that mention the character name
      const paragraphs = ch.content.split(/\n+/);
      const relevant = paragraphs.filter((p) =>
        p.includes(character.name),
      );
      if (relevant.length > 0) {
        appearances.push(
          `--- 第${ch.title} ---\n${relevant.slice(0, 5).join("\n")}`,
        );
      }
    }
  }

  const activeTemplate = await getActivePromptTemplate(
    book.id,
    "character_audit",
  );
  const template =
    activeTemplate?.template ?? DEFAULT_TEMPLATES.character_audit;

  const variables: Record<string, string> = {
    characterProfile: [
      `名称：${character.name}`,
      `等级：${character.level}`,
      `描述：${character.description || "（无）"}`,
      `外貌：${character.appearance || "（无）"}`,
      `性格：${character.traits || "（无）"}`,
      `背景：${character.background || "（无）"}`,
      `能力：${character.abilities || "（无）"}`,
      `弱点：${character.weaknesses || "（无）"}`,
    ].join("\n"),
    worldRules: [...formatRules(globalRules), ...formatRules(writingRules)].join("\n"),
    facts: formatFactList(relatedFacts),
    characterAppearances:
      appearances.length > 0
        ? appearances.join("\n\n")
        : "（该角色尚未在正文中出现）",
    ...input.extraVariables,
  };

  const userPrompt = renderTemplate(template, variables);
  const systemPrompt =
    "你是一位小说角色一致性审查专家。请根据角色设定客观分析，给出有据可查的审查结果。";

  const fullText = systemPrompt + "\n\n" + userPrompt;
  const estimatedTokens = estimateTokens(fullText);

  return {
    systemPrompt,
    userPrompt,
    functionKey: input.functionKey,
    estimatedTokens,
    metadata: {
      bookTitle: book.title,
      charactersInvolved: [character.name],
    },
  };
}

// ---------- fact_consistency ----------

async function buildFactConsistencyContext(
  input: ContextInput,
): Promise<BuiltContext> {
  const book = await requireBook(input.bookId);

  // Load all facts
  const allFacts = await getStoryFactsByBookId(book.id);

  // Load all world rules
  const worldRules = await getWorldRulesByBookId(book.id);

  // Load all character settings
  const characters = await getSettingEntitiesByBookId(
    book.id,
    "character",
  );

  const activeTemplate = await getActivePromptTemplate(
    book.id,
    "fact_consistency",
  );
  const template =
    activeTemplate?.template ?? DEFAULT_TEMPLATES.fact_consistency;

  const variables: Record<string, string> = {
    worldRules: formatRules(worldRules),
    characterSettings: formatCharacterSettings(characters),
    facts: formatFacts(allFacts),
    ...input.extraVariables,
  };

  const userPrompt = renderTemplate(template, variables);
  const systemPrompt =
    "你是一位小说事实一致性检查专家。请仔细比对所有记录，客观列出矛盾和不一致之处。";

  const fullText = systemPrompt + "\n\n" + userPrompt;
  const estimatedTokens = estimateTokens(fullText);

  return {
    systemPrompt,
    userPrompt,
    functionKey: input.functionKey,
    estimatedTokens,
    metadata: {
      bookTitle: book.title,
      factsCount: allFacts.length,
    },
  };
}

// ============================================================================
// 5. Main Entry Point
// ============================================================================

// ---------- book_info_suggest ----------

async function buildBookInfoSuggestContext(
  input: ContextInput,
): Promise<BuiltContext> {
  const book = await requireBook(input.bookId);

  const activeTemplate = await getActivePromptTemplate(
    book.id,
    input.functionKey,
  );
  const template =
    activeTemplate?.template ?? DEFAULT_TEMPLATES[input.functionKey] ?? "";

  const variables: Record<string, string> = {
    userConcept: input.selectedText || "",
    existingTitle: book.title || "",
    existingGenre: book.genre || "",
    ...input.extraVariables,
  };

  const userPrompt = renderTemplate(template, variables);
  const systemPrompt =
    "你是一位资深网络小说策划。请根据用户提供的概念，以 JSON 格式返回完整的书籍信息建议。只返回 JSON，不要包含其他内容。";

  const fullText = systemPrompt + "\n\n" + userPrompt;
  const estimatedTokens = estimateTokens(fullText);

  return {
    systemPrompt,
    userPrompt,
    functionKey: input.functionKey,
    estimatedTokens,
    metadata: {
      bookTitle: book.title,
    },
  };
}

/**
 * Build the full AI context (system + user prompt) for a given function key.
 *
 * Routes to the appropriate builder based on `input.functionKey`:
 * - `content_generate`  → chapter generation with full world/character context
 * - `review_extract`    → structured data extraction from chapter content
 * - `polish` / `deslop` / `expand` → text processing with writing rules
 * - `character_audit`   → character consistency check
 * - `fact_consistency`  → cross-reference all facts for contradictions
 * - `book_synopsis_expand` → reuses text processing pipeline
 */
export async function buildContext(
  input: ContextInput,
): Promise<BuiltContext> {
  switch (input.functionKey) {
    case "content_generate":
      return buildContentGenerationContext(input);

    case "review_extract":
      return buildReviewContext(input);

    case "polish":
    case "deslop":
    case "expand":
    case "book_synopsis_expand":
      return buildTextProcessingContext(input);

    case "character_audit":
      return buildCharacterAuditContext(input);

    case "fact_consistency":
      return buildFactConsistencyContext(input);

    case "book_info_suggest":
      return buildBookInfoSuggestContext(input);

    default:
      throw new Error(
        `不支持的 AI 功能：${input.functionKey satisfies never}`,
      );
  }
}
