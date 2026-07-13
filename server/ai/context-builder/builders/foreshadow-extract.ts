import type { ContextInput, BuiltContext, StoreDeps } from "../types";
import {
  estimateTokens,
  renderTemplate,
  formatRules,
  formatCharacterSettings,
  formatFacts,
} from "../utils";

export async function buildFactConsistencyContext(
  input: ContextInput,
  deps: StoreDeps,
): Promise<BuiltContext> {
  const book = await deps.getBookById(input.bookId);
  if (!book) {
    throw new Error(`书籍不存在（bookId: ${input.bookId}）`);
  }

  const allFacts = await deps.getStoryFactsByBookId(book.id);
  const worldRules = await deps.getWorldRulesByBookId(book.id);
  const characters = await deps.getSettingEntitiesByBookId(
    book.id,
    "character",
  );

  const activeTemplate = await deps.getActivePromptTemplate(
    "fact_consistency",
  );
  const template =
    activeTemplate?.template ?? "";

  const variables: Record<string, string> = {
    worldRules: formatRules(worldRules),
    characterSettings: formatCharacterSettings(characters),
    facts: formatFacts(allFacts),
    ...input.extraVariables,
  };

  const userPrompt = renderTemplate(template, variables);
  const systemPrompt =
    "请仔细比对所有记录，客观列出矛盾和不一致之处。";

  const fullText = systemPrompt + "\n\n" + userPrompt;
  const estimatedTokens = estimateTokens(fullText);

  return {
    systemPrompt,
    userPrompt,
    functionKey: input.functionKey,
    estimatedTokens,
    metadata: {
      bookTitle: book.title,
      factsCount: allFacts.length,
    },
  };
}
