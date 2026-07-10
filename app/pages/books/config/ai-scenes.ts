/**
 * AI Scene Registry — defines all AI scenes across workspace panels.
 *
 * Each scene maps to a context-builder functionKey and specifies:
 * - How to display input/results
 * - How to save results to the database
 */

import type { AiSceneConfig, AiPreviewField } from "@/shared/ui/ai-scene-modal";
import type { Book, WorldRuleCategory } from "@/app/types";

// ============================================================================
// Scene definitions per panel
// ============================================================================

/** Book Info panel scenes */
export function getBookInfoScenes(
  book: Book,
  onSave: (result: Record<string, unknown>) => Promise<void>,
): AiSceneConfig & { onSave: (result: unknown) => Promise<void> } {
  return {
    id: "book_info_suggest",
    title: "AI 智能填写书籍信息",
    functionKey: "book_info_suggest",
    inputLabel: "描述你的书籍概念",
    inputPlaceholder: "例如：一个修仙少年从凡人成长为仙帝的故事，融合了系统流和传统修仙元素...",
    resultMode: {
      type: "json",
      fields: [
        { label: "书名", key: "title" },
        { label: "题材", key: "_genreDisplay" },
        { label: "平台", key: "platform" },
        { label: "受众", key: "targetAudience" },
        { label: "文风", key: "writingStyle" },
        { label: "每章字数", key: "_wordCountDisplay" },
        { label: "总字数", key: "_totalWordsDisplay" },
        { label: "标签", key: "tags", type: "tag" },
        { label: "核心卖点", key: "sellingPoint", span: 2 },
        { label: "参考作品", key: "referenceWorks", span: 2 },
        { label: "简介", key: "description", span: 2 },
      ],
    },
    onSave: async (result) => {
      const r = result as Record<string, unknown>;
      const tags = Array.isArray(r.tags)
        ? (r.tags as string[]).join(",")
        : typeof r.tags === "string" ? r.tags : "";
      // Dynamic import to avoid circular deps
      const { client } = await import("@/app/api-client");
      const res = await client.patch(`/api/books/${book.id}`, {
        title: r.title || book.title,
        genre: r.genre || book.genre,
        subGenre: r.subGenre || book.subGenre,
        platform: r.platform || book.platform,
        targetAudience: r.targetAudience || book.targetAudience,
        tags,
        writingStyle: r.writingStyle || book.writingStyle,
        targetWordCount: r.targetWordCount || book.targetWordCount,
        targetTotalWords: r.targetTotalWords || book.targetTotalWords,
        referenceWorks: r.referenceWorks || book.referenceWorks,
        sellingPoint: r.sellingPoint || book.sellingPoint,
        description: r.description || book.description,
      });
      if (!res.ok) throw new Error(res.error || "保存失败");
    },
  };
}

/** World Rules panel scenes */
export function getWorldRuleScenes(
  bookId: string,
  onSave: (rules: Record<string, { name: string; content: string }[]>) => Promise<void>,
): AiSceneConfig & { onSave: (result: unknown) => Promise<void> } {
  return {
    id: "world_rule_suggest",
    title: "AI 生成世界规则",
    functionKey: "world_rule_suggest",
    inputLabel: "描述你的世界观设定",
    inputPlaceholder: "例如：修仙世界，分为凡人界和仙界，修炼体系为炼气-筑基-金丹-元婴-化神...",
    resultMode: {
      type: "json",
      fields: [
        { label: "全局规则", key: "global", span: 2 },
        { label: "写作规则", key: "writing", span: 2 },
        { label: "设定规则", key: "setting", span: 2 },
      ],
    },
    onSave: async (result) => {
      await onSave(result as Record<string, { name: string; content: string }[]>);
    },
  };
}

/** Fact Library panel scenes */
export function getFactLibraryScenes(): AiSceneConfig {
  return {
    id: "fact_consistency",
    title: "AI 事实一致性检查",
    functionKey: "fact_consistency",
    inputLabel: "描述要检查的范围或关注点（可留空检查全部）",
    inputPlaceholder: "例如：检查第3章到第5章的设定是否一致...",
    resultMode: { type: "text" },
  };
}

/** Settings Library panel scenes */
export function getSettingsLibraryScenes(): AiSceneConfig {
  return {
    id: "character_audit",
    title: "AI 角色一致性检查",
    functionKey: "character_audit",
    inputLabel: "描述要检查的角色或关注点（可留空检查全部）",
    inputPlaceholder: "例如：检查主角的能力设定是否前后一致...",
    resultMode: { type: "text" },
  };
}

/** Content Library panel scenes */
export function getContentLibraryScenes(
  chapterId?: string,
): AiSceneConfig[] {
  return [
    {
      id: "polish",
      title: "AI 全文润色",
      functionKey: "polish",
      inputLabel: "描述润色要求",
      inputPlaceholder: "例如：提升文字的表现力和感染力，保持原文风格...",
      resultMode: { type: "text" },
      extraParams: chapterId ? { chapterId } : undefined,
    },
    {
      id: "deslop",
      title: "AI 去除AI味",
      functionKey: "deslop",
      inputLabel: "描述去AI味的要求",
      inputPlaceholder: "例如：去除AI常见表达，让文字更自然...",
      resultMode: { type: "text" },
      extraParams: chapterId ? { chapterId } : undefined,
    },
    {
      id: "expand",
      title: "AI 扩写",
      functionKey: "expand",
      inputLabel: "描述扩写要求",
      inputPlaceholder: "例如：将这段文字扩展到3000字，增加细节描写...",
      resultMode: { type: "text" },
      extraParams: chapterId ? { chapterId } : undefined,
    },
  ];
}
