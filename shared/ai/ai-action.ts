/**
 * AI 操作定义 — 跨页面共享类型。
 * 放在 shared/ai/ 遵循架构规范：shared/ 是最底层，不依赖 app/ 或 server/。
 */

/** 后端支持的 AI 功能键（从 server/ai/context-builder/types.ts 复制，避免 shared→server 依赖） */
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

/** 采纳模式 */
export type AdoptMode =
  | "REPLACE_ALL"
  | "REPLACE_SELECTION"
  | "APPEND"
  | "CUSTOM";

/** 单个 AI 操作定义 */
export interface AiAction {
  /** 操作唯一标识（格式："{page}.{功能}"，如 "settings.character_audit"） */
  id: string;
  /** 显示标题 */
  title: string;
  /** 描述文字 */
  description: string;
  /** 映射到 context-builder 的 functionKey */
  functionKey: AiFunctionKey;
  /** 额外参数传给 /api/ai/chat */
  extraParams?: Record<string, unknown>;
  /** 输入框标签（留空则不显示输入框） */
  inputLabel?: string;
  /** 输入框占位文字 */
  inputPlaceholder?: string;
  /** 结果模式：text 直接显示文本，json 需解析后结构化展示 */
  resultMode?: "text" | "json";
  /** 采纳回调，接收 AI 返回的原始文本或解析后的 JSON */
  onAdopt?: (result: string | unknown) => void | Promise<void>;
  /** 采纳模式 */
  adoptMode?: AdoptMode;
}

/** /api/ai/chat 请求体 */
export interface AiChatRequest {
  functionKey: AiFunctionKey;
  bookId: string;
  selectedText?: string;
  stream?: boolean;
  chapterId?: string;
  extraVariables?: Record<string, string>;
  [key: string]: unknown;
}
