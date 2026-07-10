import { getBookById } from "@/server/storage/book-store";
import { getWorldRulesByBookId } from "@/server/storage/world-rule-store";
import { getStoryFactsByBookId } from "@/server/storage/fact-store";
import { getSettingEntitiesByBookId } from "@/server/storage/setting-entity-store";
import { getActivePromptTemplate } from "@/server/storage/prompt-template-store";
import type { ContextInput, BuiltContext } from "../types";
import {
  estimateTokens,
  renderTemplate,
  formatRules,
  formatCharacterSettings,
  formatFacts,
} from "../utils";

export async function buildFactConsistencyContext(
  input: ContextInput,
): Promise<BuiltContext> {
  const book = await getBookById(input.bookId);
  if (!book) {
    throw new Error(`书籍不存在（bookId: ${input.bookId}）`);
  }

  const allFacts = await getStoryFactsByBookId(book.id);
  const worldRules = await getWorldRulesByBookId(book.id);
  const characters = await getSettingEntitiesByBookId(
    book.id,
    "character",
  );

  const activeTemplate = await getActivePromptTemplate(
    book.id,
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
    "你是一位小说事实一致性检查专家。请仔细比对所有记录，客观列出矛盾和不一致之处。";

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
