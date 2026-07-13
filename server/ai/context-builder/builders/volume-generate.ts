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
  const fullTemplate = activeTemplate?.template ?? "";

  // Split template into system / user parts by \n---\n separator
  const sepIdx = fullTemplate.indexOf("\n---\n");
  const templateSystemPart = sepIdx !== -1 ? fullTemplate.slice(0, sepIdx) : "";
  const templateUserPart = sepIdx !== -1 ? fullTemplate.slice(sepIdx + 5) : fullTemplate;

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

  const userPrompt = renderTemplate(templateUserPart, variables);
  // System prompt: prefer template's own system part, fallback to hardcoded
  const systemPrompt = templateSystemPart || `## 输出要求
以 JSON 格式返回，不要包含其他内容：

\`\`\`json
{
  "coreConflict": "本卷的核心矛盾冲突（1-3句话）",
  "developmentArc": "情节发展走向，从本卷起点到终点（3-5句话）",
  "highlights": "本卷吸引读者继续阅读的钩子（2-3个要点）"
}
\`\`\`

## 格式约束
- coreConflict 是本卷的主要矛盾，要具体、有张力
- developmentArc 描述情节起伏，要有节奏感
- highlights 是读者读完本卷后会期待下一卷的理由
- 必须与总纲方向一致，与前序卷纲衔接连贯
- 如果用户指定了卷标题，围绕标题设计内容`;

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
