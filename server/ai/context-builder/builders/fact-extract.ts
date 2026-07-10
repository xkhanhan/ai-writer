import type { ContextInput, BuiltContext, StoreDeps } from "../types";
import { estimateTokens, renderTemplate } from "../utils";

export async function buildBookInfoSuggestContext(
  input: ContextInput,
  deps: StoreDeps,
): Promise<BuiltContext> {
  const book = await deps.getBookById(input.bookId);
  if (!book) {
    throw new Error(`书籍不存在（bookId: ${input.bookId}）`);
  }

  const activeTemplate = await deps.getActivePromptTemplate(
    book.id,
    input.functionKey,
  );
  const template =
    activeTemplate?.template ?? "";

  const variables: Record<string, string> = {
    userConcept: input.selectedText || "",
    existingTitle: book.title || "",
    existingGenre: book.genre || "",
    ...input.extraVariables,
  };

  const userPrompt = renderTemplate(template, variables);
  const systemPrompt =
    "你是一位资深网络小说策划。请根据用户提供的概念，以 JSON 格式返回完整的书籍信息建议。只返回 JSON，不要包含其他内容。";

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
