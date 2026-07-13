import type { ContextInput, BuiltContext, StoreDeps } from "../types";
import { estimateTokens, renderTemplate } from "../utils";

export async function buildOutlineOptimizeContext(
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

  const variables: Record<string, string> = {
    bookTitle: book.title,
    bookGenre: book.genre || "",
    bookStyle: book.writingStyle || "",
    currentDirection: extra.currentDirection || "（尚未填写）",
    currentStages: extra.currentStages || "（尚未填写）",
    currentSellingPoints: extra.currentSellingPoints || "（尚未填写）",
    userInstruction: input.selectedText || "",
    ...input.extraVariables,
  };

  const userPrompt = renderTemplate(templateUserPart, variables);
  // System prompt: prefer template's own system part, fallback to hardcoded
  const systemPrompt = templateSystemPart || `## 输出要求
以 JSON 格式返回优化建议，不要包含其他内容：

\`\`\`json
{
  "diagnosis": {
    "direction": "对整体方向的诊断评价（1-2句话）",
    "stages": "对阶段划分的诊断评价（1-2句话）",
    "sellingPoints": "对核心卖点的诊断评价（1-2句话）"
  },
  "optimized": {
    "direction": "优化后的整体方向",
    "stages": "优化后的阶段划分",
    "sellingPoints": "优化后的核心卖点"
  },
  "suggestions": ["建议1", "建议2", "建议3"]
}
\`\`\`

## 格式约束
- diagnosis 为诊断评价，指出当前内容的问题或亮点
- optimized 为优化后的内容
- suggestions 为 1-3 条额外建议
- 如果某个字段当前为空（"尚未填写"），则由你根据书籍信息补全`;

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
