import type {
  Book,
  ChapterOutline,
  VolumeOutline,
  WorldRule,
  WorldRuleCategory,
  SettingEntity,
  SettingCategory,
  StoryFact,
  PromptTemplate,
} from "@/shared/types";

export type AiFunctionKey =
  | "content_generate"
  | "review_extract"
  | "polish"
  | "deslop"
  | "expand"
  | "character_audit"
  | "fact_consistency"
  | "book_synopsis_expand"
  | "book_info_suggest"
  | "world_rule_suggest"
  | "outline_optimize"
  | "volume_generate";

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

/** Store function dependencies injected into builders for testability. */
export interface StoreDeps {
  getBookById: (id: string) => Promise<Book | null>;
  getChapterById: (id: string) => Promise<ChapterOutline | null>;
  getChaptersByVolumeId: (volumeId: string) => Promise<ChapterOutline[]>;
  getVolumesByBookId: (bookId: string) => Promise<VolumeOutline[]>;
  getWorldRulesByBookId: (bookId: string, category?: WorldRuleCategory) => Promise<WorldRule[]>;
  getSettingEntitiesByBookId: (bookId: string, category?: SettingCategory) => Promise<SettingEntity[]>;
  getStoryFactsByBookId: (bookId: string) => Promise<StoryFact[]>;
  getActivePromptTemplate: (functionKey: string) => Promise<PromptTemplate | null>;
}
