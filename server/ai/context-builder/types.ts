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
  | "world_rule_suggest";

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
