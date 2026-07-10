import type { ContextInput, BuiltContext, StoreDeps } from "../types";
import {
  estimateTokens,
  renderTemplate,
  formatRules,
  formatCharacterProfiles,
  formatFacts,
} from "../utils";

/** Ensure the book exists or throw. */
async function requireBook(deps: StoreDeps, bookId: string) {
  const book = await deps.getBookById(bookId);
  if (!book) {
    throw new Error(`书籍不存在（bookId: ${bookId}）`);
  }
  return book;
}

/** Ensure the chapter exists or throw. */
async function requireChapter(deps: StoreDeps, chapterId: string) {
  const chapter = await deps.getChapterById(chapterId);
  if (!chapter) {
    throw new Error(`章纲不存在（chapterId: ${chapterId}）`);
  }
  return chapter;
}

/**
 * Find the chapter that comes immediately before `currentChapter`
 * by walking its volume's chapter list.
 */
async function findPreviousChapter(
  deps: StoreDeps,
  currentChapter: { id: string; volumeId: string },
) {
  const siblings = await deps.getChaptersByVolumeId(currentChapter.volumeId);
  // Chapters are returned sorted by sort_order ASC
  const idx = siblings.findIndex((c) => c.id === currentChapter.id);
  if (idx <= 0) return null;
  return siblings[idx - 1];
}

/** Extract the last N characters of chapter content as a "previous ending". */
function extractEnding(content: string, maxLen = 500): string {
  if (!content) return "（无前文内容）";
  const trimmed = content.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `…\n${trimmed.slice(-maxLen)}`;
}

export async function buildContentGenerationContext(
  input: ContextInput,
  deps: StoreDeps,
): Promise<BuiltContext> {
  const book = await requireBook(deps, input.bookId);
  const chapter = await requireChapter(deps, input.chapterId!);

  const allChapters = await deps.getChaptersByVolumeId(chapter.volumeId);
  const chapterNumber =
    allChapters.findIndex((c) => c.id === chapter.id) + 1;

  const [globalRules, writingRules] = await Promise.all([
    deps.getWorldRulesByBookId(book.id, "global"),
    deps.getWorldRulesByBookId(book.id, "writing"),
  ]);

  const chapterCharacterNames = new Set(chapter.characters);
  const allCharacters = await deps.getSettingEntitiesByBookId(
    book.id,
    "character",
  );
  const involvedCharacters = allCharacters.filter((c) =>
    chapterCharacterNames.has(c.name),
  );
  const displayCharacters =
    involvedCharacters.length > 0
      ? involvedCharacters
      : allCharacters.filter(
          (c) => c.level === "core" || c.level === "important",
        );

  const allFacts = await deps.getStoryFactsByBookId(book.id);
  const relevantFacts = allFacts.filter(
    (f) => f.chapterNumber > 0 && f.chapterNumber < chapterNumber,
  );

  const foreshadowList =
    chapter.foreshadowings.length > 0
      ? chapter.foreshadowings.map((f) => `- ${f}`).join("\n")
      : "（无活跃伏笔）";

  const prevChapter = await findPreviousChapter(deps, chapter);
  let previousEnding = "（第一章，无前文）";
  if (prevChapter?.content) {
    previousEnding = extractEnding(prevChapter.content);
  } else if (prevChapter) {
    previousEnding = `上一章「${prevChapter.title}」摘要：${prevChapter.summary || "暂无"}`;
  }

  const activeTemplate = await deps.getActivePromptTemplate(
    book.id,
    "content_generate",
  );
  const template = activeTemplate?.template ?? "";

  const variables: Record<string, string> = {
    bookTitle: book.title,
    bookGenre: book.genre,
    bookStyle: book.writingStyle || "未设置",
    worldRules: formatRules(globalRules),
    writingRules: formatRules(writingRules),
    chapterTitle: chapter.title,
    chapterSummary: chapter.summary || "（无摘要）",
    chapterScenes: chapter.scenes.length > 0 ? chapter.scenes.map((s) => `- ${s}`).join("\n") : "（无场景）",
    chapterCharacters: chapter.characters.length > 0 ? chapter.characters.join("、") : "（无角色）",
    chapterKeyEvents: chapter.keyEvents.length > 0 ? chapter.keyEvents.map((e) => `- ${e}`).join("\n") : "（无事件）",
    characterProfiles: formatCharacterProfiles(displayCharacters),
    facts: formatFacts(relevantFacts),
    foreshadows: foreshadowList,
    previousEnding,
    expectedWords: String(chapter.expectedWords || 3000),
    ...input.extraVariables,
  };

  const userPrompt = renderTemplate(template, variables);
  const systemPrompt =
    "你是一位专业的网络小说作家助手。严格按照用户提供的章纲和规则进行创作，不要自行添加章纲以外的情节。";

  const fullText = systemPrompt + "\n\n" + userPrompt;
  const estimatedTokens = estimateTokens(fullText);

  if (estimatedTokens > 8000) {
    console.warn(
      `[ContextBuilder] content_generate token estimate (${estimatedTokens}) exceeds 8000 — proceeding.`,
    );
  }

  return {
    systemPrompt,
    userPrompt,
    functionKey: input.functionKey,
    estimatedTokens,
    metadata: {
      bookTitle: book.title,
      chapterTitle: chapter.title,
      charactersInvolved: displayCharacters.map((c) => c.name),
      factsCount: relevantFacts.length,
    },
  };
}
