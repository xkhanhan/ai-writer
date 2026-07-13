import type { ContextInput, BuiltContext, StoreDeps } from "../types";
import { estimateTokens, renderTemplate } from "../utils";

export async function buildOutlineOptimizeContext(
  input: ContextInput,
  deps: StoreDeps,
): Promise<BuiltContext> {
  const book = await deps.getBookById(input.bookId);
  if (!book) {
    throw new Error(`书籍不存在（bookId: ${input.bookId}）`);
  }

  const activeTemplate = await deps.getActivePromptTemplate(
    input.functionKey,
  );
  const template = activeTemplate?.template ?? "";

  const extra = input.extraVariables ?? {};

  const variables: Record<string, string> = {
    bookTitle: book.title,
    bookGenre: book.genre || "",
    bookStyle: book.writingStyle || "",
    currentDirection: extra.currentDirection || "（尚未填写）",
    currentStages: extra.currentStages || "（尚未填写）",
    currentSellingPoints: extra.currentSellingPoints || "（尚未填写）",
    userInstruction: input.selectedText || "",
    ...input.extraVariables,
  };

  const userPrompt = renderTemplate(template, variables);
  const systemPrompt =
    "你是一位资深网络小说策划编辑，擅长优化故事总纲。请根据当前总纲内容和书籍信息，给出结构化的优化建议。";

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
