import type { ContextInput, BuiltContext, StoreDeps } from "../types";
import { estimateTokens, renderTemplate } from "../utils";

export async function buildReviewContext(
  input: ContextInput,
  deps: StoreDeps,
): Promise<BuiltContext> {
  const book = await deps.getBookById(input.bookId);
  if (!book) {
    throw new Error(`书籍不存在（bookId: ${input.bookId}）`);
  }
  const chapter = await deps.getChapterById(input.chapterId!);
  if (!chapter) {
    throw new Error(`章纲不存在（chapterId: ${input.chapterId}）`);
  }

  const allChapters = await deps.getChaptersByVolumeId(chapter.volumeId);
  const chapterNumber =
    allChapters.findIndex((c) => c.id === chapter.id) + 1;

  const allCharacters = await deps.getSettingEntitiesByBookId(
    book.id,
    "character",
  );

  const allChaptersInVolume = await deps.getChaptersByVolumeId(
    chapter.volumeId,
  );
  const foreshadowSet = new Set<string>();
  for (const ch of allChaptersInVolume) {
    const chIdx = allChaptersInVolume.indexOf(ch);
    if (chIdx <= allChapters.findIndex((c) => c.id === chapter.id)) {
      for (const f of ch.foreshadowings) {
        foreshadowSet.add(f);
      }
    }
  }

  const activeTemplate = await deps.getActivePromptTemplate(
    "review_extract",
  );
  const template = activeTemplate?.template ?? "";

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
    "只返回 JSON，不要包含其他内容。";

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
