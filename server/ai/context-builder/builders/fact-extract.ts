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
    },
  };
}
