import { jsonSuccess, jsonError } from "@/app/api/utils";
import { getBookById } from "@/server/storage/book-store";
import { getVolumesByBookId, getChaptersByVolumeId } from "@/server/storage/outline-store";
import { getSettingEntitiesByBookId } from "@/server/storage/setting-entity-store";
import { getWorldRulesByBookId } from "@/server/storage/world-rule-store";
import { getStoryFactsByBookId } from "@/server/storage/fact-store";
import { getForeshadowsByBookId } from "@/server/storage/foreshadow-store";
import { getVariablesForFunction } from "@/server/ai/variable-registry";

/**
 * POST /api/ai/preview
 *
 * Body: { template: string, bookId: string, functionKey: string }
 *
 * Queries all data sources for the given bookId, builds a variable map,
 * and returns the template with all variables resolved.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("请求体必须是 JSON。");
  }

  const payload = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const template = typeof payload.template === "string" ? payload.template : "";
  const bookId = typeof payload.bookId === "string" ? payload.bookId : "";
  const functionKey = typeof payload.functionKey === "string" ? payload.functionKey : "";

  if (!template) return jsonError("template is required.");
  if (!bookId) return jsonError("bookId is required.");

  // 1. Query all data sources in parallel
  const [book, volumes, characters, worldRules, facts, foreshadows] = await Promise.all([
    getBookById(bookId),
    getVolumesByBookId(bookId).catch(() => []),
    getSettingEntitiesByBookId(bookId, "character").catch(() => []),
    getWorldRulesByBookId(bookId).catch(() => []),
    getStoryFactsByBookId(bookId).catch(() => []),
    getForeshadowsByBookId(bookId).catch(() => []),
  ]);

  if (!book) return jsonError("Book not found.", 404);

  // 2. Get all chapters across all volumes
  const allChapters: Awaited<ReturnType<typeof getChaptersByVolumeId>>[number][] = [];
  for (const vol of volumes) {
    const chapters = await getChaptersByVolumeId(vol.id).catch(() => []);
    allChapters.push(...chapters);
  }
  // Sort by sort order
  allChapters.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  // 3. Build variable map from data sources
  const variableMap: Record<string, string> = {};

  // Book variables
  variableMap["bookTitle"] = book.title || "[未设置]";
  variableMap["bookGenre"] = book.genre || "[未设置]";
  variableMap["bookSynopsis"] = book.description || "[未设置]";
  variableMap["bookCoreSellingPoint"] = book.sellingPoint || "[未设置]";
  variableMap["bookCharacterCount"] = book.targetWordCount ? `${book.targetWordCount}` : "[未设置]";
  variableMap["bookStyle"] = book.writingStyle || "[未设置]";
  variableMap["bookSellingPoint"] = book.sellingPoint || "[未设置]";
  variableMap["originalDescription"] = book.description || "[未设置]";
  variableMap["existingTitle"] = book.title || "[未设置]";
  variableMap["existingGenre"] = book.genre || "[未设置]";
  variableMap["userSupplement"] = "[未设置]";
  variableMap["outputFormat"] = "[输出格式]";

  // Chapter variables (use latest chapter as default context)
  const latestChapter = allChapters.length > 0 ? allChapters[allChapters.length - 1] : null;
  variableMap["chapterTitle"] = latestChapter?.title || "[未设置]";
  variableMap["chapterSummary"] = latestChapter?.summary || "[未设置]";
  variableMap["chapterScenes"] = Array.isArray(latestChapter?.scenes) ? latestChapter!.scenes.join("\n") : "[未设置]";
  variableMap["chapterCharacters"] = Array.isArray(latestChapter?.characters) ? latestChapter!.characters.join("、") : "[未设置]";
  variableMap["chapterKeyEvents"] = Array.isArray(latestChapter?.keyEvents) ? latestChapter!.keyEvents.join("\n") : "[未设置]";
  variableMap["chapterInfo"] = latestChapter
    ? `${latestChapter.title}\n${latestChapter.summary || ""}`
    : "[未设置]";
  variableMap["chapterContent"] = latestChapter?.content || "[章节内容需要从正文库获取]";
  variableMap["chapterContext"] = latestChapter
    ? latestChapter.title
    : "[未设置]";
  variableMap["previousEnding"] = allChapters.length >= 2
    ? (allChapters[allChapters.length - 2].content || "[前文衔接需要从正文库获取]")
    : "[前文衔接需要从正文库获取]";

  // Character variables
  if (characters.length > 0) {
    const profiles = characters.map((c) => {
      const fields = [];
      if (c.name) fields.push(`姓名: ${c.name}`);
      if (c.description) fields.push(`描述: ${c.description}`);
      if (c.statusFields) {
        const status = typeof c.statusFields === "string" ? JSON.parse(c.statusFields) : c.statusFields;
        for (const [k, v] of Object.entries(status)) {
          if (v) fields.push(`${k}: ${v}`);
        }
      }
      return fields.join("\n");
    });
    variableMap["characterProfiles"] = profiles.join("\n\n");
    variableMap["characterSettings"] = profiles.join("\n\n");
    variableMap["characterAppearances"] = characters.map((c) => c.name).join("、");
    variableMap["existingCharacters"] = characters.map((c) => c.name).join("、");
  } else {
    variableMap["characterProfiles"] = "[未设置]";
    variableMap["characterSettings"] = "[未设置]";
    variableMap["characterAppearances"] = "[未设置]";
    variableMap["existingCharacters"] = "[未设置]";
  }

  // World rules (field is `name`, not `title`)
  if (worldRules.length > 0) {
    const globalRules = worldRules.filter((r) => r.category === "global").map((r) => `- ${r.name}: ${r.content || ""}`);
    const writingRules = worldRules.filter((r) => r.category === "writing").map((r) => `- ${r.name}: ${r.content || ""}`);
    const settingRules = worldRules.filter((r) => r.category === "setting").map((r) => `- ${r.name}: ${r.content || ""}`);

    variableMap["worldRules"] = globalRules.length > 0 ? globalRules.join("\n") : "[未设置]";
    variableMap["writingRules"] = writingRules.length > 0 ? writingRules.join("\n") : "[未设置]";
    variableMap["existingRules"] = settingRules.length > 0 ? settingRules.join("\n") : "[未设置]";
  } else {
    variableMap["worldRules"] = "[未设置]";
    variableMap["writingRules"] = "[未设置]";
    variableMap["existingRules"] = "[未设置]";
  }

  // Facts (field is `content`, no `title`)
  if (facts.length > 0) {
    variableMap["facts"] = facts.map((f) => `- ${f.content}`).join("\n");
  } else {
    variableMap["facts"] = "[未设置]";
  }

  // Foreshadows (fields: `name`, `description`)
  if (foreshadows.length > 0) {
    variableMap["foreshadows"] = foreshadows.map((f) => `- ${f.name}: ${f.description || ""}`).join("\n");
    variableMap["existingForeshadows"] = foreshadows.map((f) => f.name).join("、");
  } else {
    variableMap["foreshadows"] = "[未设置]";
    variableMap["existingForeshadows"] = "[未设置]";
  }

  // Constants
  variableMap["expectedWords"] = "3000";
  variableMap["targetWords"] = "3000";
  variableMap["userConcept"] = "[用户补充]";

  // 4. Resolve variables in template
  const resolved = template.replace(/\$\{(\w+)\}/g, (_match, varName: string) => {
    if (varName in variableMap) return variableMap[varName];
    return `[${varName}]`;
  });

  // 5. Return resolved template + variable definitions for the panel
  const varDefs = getVariablesForFunction(functionKey);

  return jsonSuccess({
    resolved,
    variables: varDefs,
    stats: {
      books: 1,
      chapters: allChapters.length,
      characters: characters.length,
      worldRules: worldRules.length,
      facts: facts.length,
      foreshadows: foreshadows.length,
    },
  });
}
