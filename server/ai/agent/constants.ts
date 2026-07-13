/**
 * Agent Server Constants — server-side configuration for the AI agent system.
 *
 * Client-side UI constants are in shared/constants/agent-ui.ts
 */

// ---------------------------------------------------------------------------
// Conversation Limits
// ---------------------------------------------------------------------------

/** Maximum number of recent messages to load for context */
export const MAX_HISTORY_MESSAGES = 50;

/** Maximum length for conversation title (auto-generated from first message) */
export const CONVERSATION_TITLE_MAX_LENGTH = 50;

/** Suffix added when title is truncated */
export const TITLE_TRUNCATE_SUFFIX = "...";

// ---------------------------------------------------------------------------
// Field Label Maps
// ---------------------------------------------------------------------------

/** Labels for outline fields (used in tool responses) */
export const OUTLINE_FIELD_LABELS: Record<string, string> = {
  direction: "整体方向",
  stages: "阶段划分",
  sellingPoints: "核心卖点",
};

/** Labels for volume fields (used in tool responses) */
export const VOLUME_FIELD_LABELS: Record<string, string> = {
  coreConflict: "核心冲突",
  developmentArc: "发展弧线",
  highlights: "看点",
};

// ---------------------------------------------------------------------------
// Re-export shared constants for server convenience
// ---------------------------------------------------------------------------

export {
  SCORE_THRESHOLD_EXCELLENT,
  SCORE_THRESHOLD_GOOD,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  TARGET_TYPE_LABELS,
  ACTION_TYPE_LABELS,
  AGENT_UI_TEXT,
} from "@/shared/constants/agent-ui";
