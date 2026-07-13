import type { ContextInput, BuiltContext, StoreDeps } from "../types";
import { estimateTokens, renderTemplate, formatRules } from "../utils";

export async function buildTextProcessingContext(
  input: ContextInput,
  deps: StoreDeps,
): Promise<BuiltContext> {
  const book = await deps.getBookById(input.bookId);
  if (!book) {
    throw new Error(`书籍不存在（bookId: ${input.bookId}）`);
  }

  const writingRules = await deps.getWorldRulesByBookId(book.id, "writing");

  let chapterContext = "（无章纲上下文）";
  if (input.chapterId) {
    const chapter = await deps.getChapterById(input.chapterId);
    if (chapter) {
      chapterContext = [
        `标题：${chapter.title}`,
        `摘要：${chapter.summary || ""}`,
        `场景：${chapter.scenes.join("、")}`,
        `事件：${chapter.keyEvents.join("、")}`,
      ].join("\n");
    }
  }

  const activeTemplate = await deps.getActivePromptTemplate(
    input.functionKey,
  );
  const template =
    activeTemplate?.template ?? "";

  const variables: Record<string, string> = {
    bookTitle: book.title,
    bookGenre: book.genre,
    writingRules: formatRules(writingRules),
    selectedText: input.selectedText || "（未提供选中文本）",
    targetWords: String(input.extraVariables?.targetWords ?? 2000),
    chapterContext,
    originalDescription: book.description || "",
    sellingPoint: book.sellingPoint || "",
    ...input.extraVariables,
  };

  const userPrompt = renderTemplate(template, variables);
  const systemPrompt =
    "请严格按照要求对文本进行处理，保持原文核心内容不变。";

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
