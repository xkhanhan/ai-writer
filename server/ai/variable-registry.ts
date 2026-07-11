/**
 * Variable registry: defines which variables each functionKey uses,
 * their display names, descriptions, and data sources.
 */

export interface VariableDef {
  name: string;
  displayName: string;
  description: string;
  source: "book" | "chapter" | "character" | "foreshadow" | "fact" | "rule" | "user" | "constant";
  required: boolean;
}

/**
 * Per-functionKey variable definitions.
 * Variables not listed here are treated as unknown and kept as-is in preview.
 */
export const FUNCTION_VARIABLES: Record<string, VariableDef[]> = {
  book_info_suggest: [
    { name: "userConcept", displayName: "用户构思", description: "用户对书籍的初步构思", source: "user", required: false },
    { name: "existingTitle", displayName: "已有书名", description: "已确定的书籍标题", source: "book", required: false },
    { name: "existingGenre", displayName: "已有题材", description: "已确定的题材类型", source: "book", required: false },
  ],
  world_rule_suggest: [
    { name: "bookTitle", displayName: "书籍名称", description: "当前书籍的标题", source: "book", required: true },
    { name: "bookGenre", displayName: "题材类型", description: "书籍的题材/类型", source: "book", required: true },
    { name: "bookSellingPoint", displayName: "核心卖点", description: "书籍的核心吸引力", source: "book", required: false },
    { name: "userConcept", displayName: "用户构思", description: "用户对世界的初步设定", source: "user", required: false },
    { name: "existingRules", displayName: "已有规则", description: "已存在的世界规则", source: "rule", required: false },
  ],
  content_generate: [
    { name: "bookTitle", displayName: "书籍名称", description: "当前书籍的标题", source: "book", required: true },
    { name: "bookGenre", displayName: "题材类型", description: "书籍的题材/类型", source: "book", required: true },
    { name: "bookStyle", displayName: "写作风格", description: "书籍的写作风格", source: "book", required: false },
    { name: "worldRules", displayName: "世界规则", description: "全局世界观规则", source: "rule", required: false },
    { name: "writingRules", displayName: "写作规则", description: "写作规范和约束", source: "rule", required: false },
    { name: "chapterTitle", displayName: "章节标题", description: "当前章节的标题", source: "chapter", required: true },
    { name: "chapterSummary", displayName: "章节摘要", description: "当前章节的剧情摘要", source: "chapter", required: false },
    { name: "chapterScenes", displayName: "场景列表", description: "章节包含的场景", source: "chapter", required: false },
    { name: "chapterCharacters", displayName: "出场人物", description: "本章出场的角色", source: "chapter", required: false },
    { name: "chapterKeyEvents", displayName: "关键事件", description: "本章关键剧情事件", source: "chapter", required: false },
    { name: "characterProfiles", displayName: "角色档案", description: "相关角色的详细信息", source: "character", required: false },
    { name: "facts", displayName: "事实记录", description: "已确认的故事事实", source: "fact", required: false },
    { name: "foreshadows", displayName: "活跃伏笔", description: "需要回收的伏笔", source: "foreshadow", required: false },
    { name: "previousEnding", displayName: "前文衔接", description: "上一章的结尾内容", source: "chapter", required: false },
    { name: "expectedWords", displayName: "目标字数", description: "期望的正文字数", source: "constant", required: false },
  ],
  review_extract: [
    { name: "chapterInfo", displayName: "章节信息", description: "当前章节的基本信息", source: "chapter", required: true },
    { name: "chapterContent", displayName: "章节内容", description: "当前章节的正文内容", source: "chapter", required: true },
    { name: "existingCharacters", displayName: "已有角色", description: "设定库中已有的角色", source: "character", required: false },
    { name: "existingForeshadows", displayName: "已有伏笔", description: "已存在的伏笔列表", source: "foreshadow", required: false },
  ],
  polish: [
    { name: "bookTitle", displayName: "书籍名称", description: "当前书籍的标题", source: "book", required: true },
    { name: "bookGenre", displayName: "题材类型", description: "书籍的题材/类型", source: "book", required: true },
    { name: "writingRules", displayName: "写作规则", description: "写作规范和约束", source: "rule", required: false },
    { name: "selectedText", displayName: "选中文本", description: "用户选中需要润色的文本", source: "user", required: true },
    { name: "targetWords", displayName: "目标字数", description: "期望的输出字数", source: "constant", required: false },
    { name: "chapterContext", displayName: "章节上下文", description: "当前章节的上下文信息", source: "chapter", required: false },
  ],
  deslop: [
    { name: "bookTitle", displayName: "书籍名称", description: "当前书籍的标题", source: "book", required: true },
    { name: "bookGenre", displayName: "题材类型", description: "书籍的题材/类型", source: "book", required: true },
    { name: "writingRules", displayName: "写作规则", description: "写作规范和约束", source: "rule", required: false },
    { name: "selectedText", displayName: "选中文本", description: "用户选中需要去AI味的文本", source: "user", required: true },
    { name: "targetWords", displayName: "目标字数", description: "期望的输出字数", source: "constant", required: false },
    { name: "chapterContext", displayName: "章节上下文", description: "当前章节的上下文信息", source: "chapter", required: false },
  ],
  expand: [
    { name: "bookTitle", displayName: "书籍名称", description: "当前书籍的标题", source: "book", required: true },
    { name: "bookGenre", displayName: "题材类型", description: "书籍的题材/类型", source: "book", required: true },
    { name: "writingRules", displayName: "写作规则", description: "写作规范和约束", source: "rule", required: false },
    { name: "selectedText", displayName: "选中文本", description: "用户选中需要扩写的文本", source: "user", required: true },
    { name: "targetWords", displayName: "目标字数", description: "期望的输出字数", source: "constant", required: false },
    { name: "chapterContext", displayName: "章节上下文", description: "当前章节的上下文信息", source: "chapter", required: false },
  ],
  fact_consistency: [
    { name: "worldRules", displayName: "世界规则", description: "全局世界观规则", source: "rule", required: false },
    { name: "characterSettings", displayName: "角色设定", description: "所有角色的设定信息", source: "character", required: false },
    { name: "facts", displayName: "事实记录", description: "已确认的故事事实", source: "fact", required: false },
  ],
  character_audit: [
    { name: "characterProfile", displayName: "角色档案", description: "待审计角色的详细信息", source: "character", required: true },
    { name: "worldRules", displayName: "世界规则", description: "全局世界观规则", source: "rule", required: false },
    { name: "facts", displayName: "事实记录", description: "已确认的故事事实", source: "fact", required: false },
    { name: "characterAppearances", displayName: "角色出场", description: "角色在各章节的出场记录", source: "character", required: false },
  ],
  book_synopsis_expand: [
    { name: "bookTitle", displayName: "书籍名称", description: "当前书籍的标题", source: "book", required: true },
    { name: "bookGenre", displayName: "题材类型", description: "书籍的题材/类型", source: "book", required: true },
    { name: "originalDescription", displayName: "原始简介", description: "书籍当前的简介内容", source: "book", required: false },
    { name: "sellingPoint", displayName: "核心卖点", description: "书籍的核心吸引力", source: "book", required: false },
    { name: "targetWords", displayName: "目标字数", description: "期望的简介字数", source: "constant", required: false },
    { name: "writingRules", displayName: "写作规则", description: "写作规范和约束", source: "rule", required: false },
  ],
};

/**
 * Get variable definitions for a functionKey.
 * Falls back to the 7 built-in variables if functionKey is not in the registry.
 */
export function getVariablesForFunction(functionKey: string): VariableDef[] {
  return FUNCTION_VARIABLES[functionKey] ?? [];
}
