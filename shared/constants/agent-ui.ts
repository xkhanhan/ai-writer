/**
 * Agent UI Constants — shared between client and server.
 *
 * All UI text, labels, and display-related constants should be defined here.
 */

// ---------------------------------------------------------------------------
// Evaluation Score Thresholds
// ---------------------------------------------------------------------------

/** Score >= this value is considered "excellent" (green) */
export const SCORE_THRESHOLD_EXCELLENT = 80;

/** Score >= this value is considered "good" (orange) */
export const SCORE_THRESHOLD_GOOD = 60;

// ---------------------------------------------------------------------------
// Priority Colors
// ---------------------------------------------------------------------------

/** Color mapping for priority levels */
export const PRIORITY_COLORS: Record<string, string> = {
  high: "red",
  medium: "orange",
  low: "blue",
};

/** Labels for priority levels */
export const PRIORITY_LABELS: Record<string, string> = {
  high: "高优先级",
  medium: "中优先级",
  low: "低优先级",
};

// ---------------------------------------------------------------------------
// Target Type Labels
// ---------------------------------------------------------------------------

/** Labels for target types (used in tool result display) */
export const TARGET_TYPE_LABELS: Record<string, string> = {
  outline: "总纲",
  volume: "卷纲",
  content: "正文",
};

// ---------------------------------------------------------------------------
// Action Type Labels
// ---------------------------------------------------------------------------

/** Labels for action types (used in tool result display) */
export const ACTION_TYPE_LABELS: Record<string, string> = {
  propose_update: "建议修改",
  generate: "生成",
  suggestion: "建议",
  evaluation: "评估",
};

// ---------------------------------------------------------------------------
// UI Text Constants
// ---------------------------------------------------------------------------

export const AGENT_UI_TEXT = {
  // Empty states
  LOADING: "加载中...",
  NO_CONVERSATIONS: "暂无历史对话",
  WELCOME_HINT: "请描述你的需求，或点击上方快捷按钮开始",

  // Roles
  ROLE_USER: "你",
  ROLE_AI: "AI",

  // Actions
  SEND: "发送",
  STOP: "停止",
  RETRY: "重试",
  CLOSE: "关闭",
  HISTORY: "历史对话",
  NEW_CONVERSATION: "新对话",
  ADOPT: "采纳",
  REJECT: "拒绝",

  // Tool states
  PROCESSING: "正在处理...",
  SCORE_LABEL: "评分:",
  HIGHLIGHTS_LABEL: "亮点:",
  CONCERNS_LABEL: "关注点:",
  SUGGEST_MODIFY: "建议修改:",

  // Error messages
  CHAT_ERROR: "对话出错",
  DELETE_FAILED: "删除失败",
  CONVERSATION_DELETED: "对话已删除",

  // Default panel title
  PANEL_TITLE: "AI 写作助手",
} as const;
