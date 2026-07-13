import type { ContextInput, BuiltContext, StoreDeps } from "../types";
import { estimateTokens, renderTemplate } from "../utils";

export async function buildVolumeGenerateContext(
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

  // Load outline from extraVariables (passed by frontend)
  const outlineDirection = extra.outlineDirection || "（尚未填写）";
  const outlineStages = extra.outlineStages || "（尚未填写）";
  const outlineSellingPoints = extra.outlineSellingPoints || "（尚未填写）";

  // Load all volumes for context (to maintain continuity)
  const allVolumes = await deps.getVolumesByBookId(input.bookId);

  const editingVolumeIndex = extra.editingVolumeIndex
    ? Number(extra.editingVolumeIndex)
    : allVolumes.length;

  const previousVolumesSummary = allVolumes
    .filter((_, i) => i < editingVolumeIndex)
    .map((v, i) => {
      const parts = [`第${i + 1}卷：${v.title}`];
      if (v.coreConflict) parts.push(`  核心冲突：${v.coreConflict}`);
      if (v.developmentArc) parts.push(`  发展弧线：${v.developmentArc}`);
      if (v.highlights) parts.push(`  看点：${v.highlights}`);
      return parts.join("\n");
    })
    .join("\n\n");

  const variables: Record<string, string> = {
    bookTitle: book.title,
    bookGenre: book.genre || "",
    bookStyle: book.writingStyle || "",
    outlineDirection,
    outlineStages,
    outlineSellingPoints,
    previousVolumes: previousVolumesSummary || "（这是第一卷）",
    currentVolumeTitle: extra.currentVolumeTitle || `第${editingVolumeIndex + 1}卷`,
    currentVolumeConflict: extra.currentVolumeConflict || "",
    currentVolumeArc: extra.currentVolumeArc || "",
    currentVolumeHighlights: extra.currentVolumeHighlights || "",
    userInstruction: input.selectedText || "",
    ...input.extraVariables,
  };

  const userPrompt = renderTemplate(template, variables);
  const systemPrompt =
    "你是一位资深网络小说策划编辑，擅长设计卷纲结构。请根据总纲和已有卷纲信息，为当前卷生成合理的核心冲突、发展弧线和看点。";

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
