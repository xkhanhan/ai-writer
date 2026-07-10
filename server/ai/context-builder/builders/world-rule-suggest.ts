import type { ContextInput, BuiltContext, StoreDeps } from "../types";
import { estimateTokens, renderTemplate } from "../utils";

export async function buildWorldRuleSuggestContext(
  input: ContextInput,
  deps: StoreDeps,
): Promise<BuiltContext> {
  const book = await deps.getBookById(input.bookId);
  if (!book) {
    throw new Error(`书籍不存在（bookId: ${input.bookId}）`);
  }

  const existingRules = await deps.getWorldRulesByBookId(book.id);
  const existingRulesText =
    existingRules.length > 0
      ? existingRules
          .map((r) => `- [${r.category}] ${r.name}: ${r.content}`)
          .join("\n")
      : "（暂无）";

  const activeTemplate = await deps.getActivePromptTemplate(
    input.functionKey,
  );
  const template =
    activeTemplate?.template ?? "";

  const variables: Record<string, string> = {
    bookTitle: book.title,
    bookGenre: book.genre || "",
    bookSellingPoint: book.sellingPoint || "",
    userConcept: input.selectedText || "",
    existingRules: existingRulesText,
    ...input.extraVariables,
  };

  const userPrompt = renderTemplate(template, variables);
  const systemPrompt =
    "你是一位资深网络小说世界观架构师。请根据书籍信息，以 JSON 格式返回世界规则建议。只返回 JSON，不要包含其他内容。";

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
