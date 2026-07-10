import type { ContextInput, BuiltContext, StoreDeps } from "../types";
import { estimateTokens, renderTemplate, formatRules, formatFactList } from "../utils";

export async function buildCharacterAuditContext(
  input: ContextInput,
  deps: StoreDeps,
): Promise<BuiltContext> {
  const book = await deps.getBookById(input.bookId);
  if (!book) {
    throw new Error(`书籍不存在（bookId: ${input.bookId}）`);
  }

  if (!input.characterId) {
    throw new Error("character_audit 需要提供 characterId");
  }
  const allEntities = await deps.getSettingEntitiesByBookId(book.id);
  const character = allEntities.find((e) => e.id === input.characterId);
  if (!character) {
    throw new Error(`角色不存在（characterId: ${input.characterId}）`);
  }

  const [globalRules, writingRules] = await Promise.all([
    deps.getWorldRulesByBookId(book.id, "global"),
    deps.getWorldRulesByBookId(book.id, "writing"),
  ]);

  const allFacts = await deps.getStoryFactsByBookId(book.id);
  const relatedFacts = allFacts.filter((f) =>
    f.relatedCharacterIds.includes(character.id),
  );

  const allVolumes = await deps.getVolumesByBookId(book.id);
  const appearances: string[] = [];
  for (const vol of allVolumes) {
    const chapters = await deps.getChaptersByVolumeId(vol.id);
    for (const ch of chapters) {
      if (!ch.content) continue;
      const paragraphs = ch.content.split(/\n+/);
      const relevant = paragraphs.filter((p) =>
        p.includes(character.name),
      );
      if (relevant.length > 0) {
        appearances.push(
          `--- 第${ch.title} ---\n${relevant.slice(0, 5).join("\n")}`,
        );
      }
    }
  }

  const activeTemplate = await deps.getActivePromptTemplate(
    "character_audit",
  );
  const template =
    activeTemplate?.template ?? "";

  const globalRulesText = formatRules(globalRules);
  const writingRulesText = formatRules(writingRules);

  const variables: Record<string, string> = {
    characterProfile: [
      `名称：${character.name}`,
      `等级：${character.level}`,
      `描述：${character.description || "（无）"}`,
      `外貌：${character.appearance || "（无）"}`,
      `性格：${character.traits || "（无）"}`,
      `背景：${character.background || "（无）"}`,
      `能力：${character.abilities || "（无）"}`,
      `弱点：${character.weaknesses || "（无）"}`,
    ].join("\n"),
    worldRules: [...globalRulesText, ...writingRulesText].join("\n"),
    facts: formatFactList(relatedFacts),
    characterAppearances:
      appearances.length > 0
        ? appearances.join("\n\n")
        : "（该角色尚未在正文中出现）",
    ...input.extraVariables,
  };

  const userPrompt = renderTemplate(template, variables);
  const systemPrompt =
    "你是一位小说角色一致性审查专家。请根据角色设定客观分析，给出有据可查的审查结果。";

  const fullText = systemPrompt + "\n\n" + userPrompt;
  const estimatedTokens = estimateTokens(fullText);

  return {
    systemPrompt,
    userPrompt,
    functionKey: input.functionKey,
    estimatedTokens,
    metadata: {
      bookTitle: book.title,
      charactersInvolved: [character.name],
    },
  };
}
