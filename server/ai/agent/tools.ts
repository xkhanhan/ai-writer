/**
 * Agent Tools — defines tools that AI can call.
 *
 * Tools are defined using Vercel AI SDK v7 format (inputSchema).
 */

import { tool } from "ai";
import { zodSchema } from "ai";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Tool Definitions (Vercel AI SDK v7 format with inputSchema)
// ---------------------------------------------------------------------------

export const agentTools = {
  /** Propose an update to outline fields */
  propose_outline_update: tool({
    description:
      "建议修改总纲的某个字段。当判断需要修改时调用此工具。修改不会立即生效，需要用户确认。",
    inputSchema: zodSchema(z.object({
      field: z
        .enum(["direction", "stages", "sellingPoints"])
        .describe("要修改的字段名"),
      content: z.string().describe("修改后的内容"),
      reason: z.string().describe("修改原因，会展示给用户"),
    })),
    execute: async ({ field, content, reason }) => {
      return {
        success: true,
        actionType: "propose_update",
        targetType: "outline",
        field,
        content,
        reason,
        message: `已提出修改${getFieldLabel(field)}的建议，等待用户确认`,
      };
    },
  }),

  /** Propose an update to volume fields */
  propose_volume_update: tool({
    description:
      "建议修改卷纲的某个字段。当判断需要修改时调用此工具。修改不会立即生效，需要用户确认。",
    inputSchema: zodSchema(z.object({
      field: z
        .enum(["coreConflict", "developmentArc", "highlights"])
        .describe("要修改的字段名"),
      content: z.string().describe("修改后的内容"),
      reason: z.string().describe("修改原因，会展示给用户"),
    })),
    execute: async ({ field, content, reason }) => {
      return {
        success: true,
        actionType: "propose_update",
        targetType: "volume",
        field,
        content,
        reason,
        message: `已提出修改${getVolumeFieldLabel(field)}的建议，等待用户确认`,
      };
    },
  }),

  /** Propose an update to content (chapter text) */
  propose_content_update: tool({
    description:
      "建议修改正文内容。当判断需要修改时调用此工具。修改不会立即生效，需要用户确认。",
    inputSchema: zodSchema(z.object({
      content: z.string().describe("修改后的内容"),
      reason: z.string().describe("修改原因，会展示给用户"),
    })),
    execute: async ({ content, reason }) => {
      return {
        success: true,
        actionType: "propose_update",
        targetType: "content",
        field: "content",
        content,
        reason,
        message: "已提出修改建议，等待用户确认",
      };
    },
  }),

  /** Generate content for a chapter */
  generate_content: tool({
    description: "生成正文内容。用于根据章纲生成完整的章节正文。",
    inputSchema: zodSchema(z.object({
      content: z.string().describe("生成的正文内容"),
      wordCount: z.number().describe("生成的字数"),
    })),
    execute: async ({ content, wordCount }) => {
      return {
        success: true,
        actionType: "generate",
        targetType: "content",
        content,
        wordCount,
        message: `已生成正文，共${wordCount}字`,
      };
    },
  }),

  /** Add a suggestion */
  add_suggestion: tool({
    description: "添加一条优化建议。建议不会自动应用，需要用户确认。",
    inputSchema: zodSchema(z.object({
      suggestion: z.string().describe("建议内容"),
      priority: z
        .enum(["high", "medium", "low"])
        .optional()
        .describe("建议优先级"),
    })),
    execute: async ({ suggestion, priority }) => {
      return {
        success: true,
        actionType: "suggestion",
        suggestion,
        priority: priority ?? "medium",
        message: "建议已添加",
      };
    },
  }),

  /** Show evaluation result */
  show_evaluation: tool({
    description: "展示对当前内容的评估结果。",
    inputSchema: zodSchema(z.object({
      score: z.number().min(0).max(100).describe("评分 0-100"),
      summary: z.string().describe("一句话总结"),
      highlights: z
        .array(z.string())
        .optional()
        .describe("亮点列表"),
      concerns: z
        .array(z.string())
        .optional()
        .describe("关注点列表"),
    })),
    execute: async ({ score, summary, highlights, concerns }) => {
      return {
        success: true,
        actionType: "evaluation",
        evaluation: {
          score,
          summary,
          highlights: highlights ?? [],
          concerns: concerns ?? [],
        },
        message: `评估完成：${score}分 - ${summary}`,
      };
    },
  }),
};

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

function getFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    direction: "整体方向",
    stages: "阶段划分",
    sellingPoints: "核心卖点",
  };
  return labels[field] ?? field;
}

function getVolumeFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    coreConflict: "核心冲突",
    developmentArc: "发展弧线",
    highlights: "看点",
  };
  return labels[field] ?? field;
}

// ---------------------------------------------------------------------------
// Tool filter for scenes
// ---------------------------------------------------------------------------

export type AgentTools = typeof agentTools;

export function getToolsForScene(
  availableTools: string[]
): Record<string, any> {
  const tools: Record<string, any> = {};
  for (const toolName of availableTools) {
    if (toolName in agentTools) {
      const key = toolName as keyof AgentTools;
      tools[key] = agentTools[key];
    }
  }
  return tools;
}
