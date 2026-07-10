import { NextResponse } from "next/server";
import type { AiTextTaskInput } from "@/shared/ai/contracts";
import { generateAiText } from "@/server/ai/generate-ai-text";
import { buildContext, type AiFunctionKey } from "@/server/ai/context-builder";
import { createGenerationSession } from "@/server/storage/ai-generation-store";

function jsonError(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

/** Helper to extract a string from the parsed body. */
function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("请求体必须是 JSON。");
  }

  const payload =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {};

  const functionKey = str(payload.functionKey);

  // ------------------------------------------------------------------
  // Mode 2: ContextBuilder-based generation
  // ------------------------------------------------------------------
  if (functionKey) {
    const bookId = str(payload.bookId);
    if (!bookId) {
      return jsonError("functionKey 模式下 bookId 为必填。");
    }

    const allowedKeys: AiFunctionKey[] = [
      "content_generate",
      "review_extract",
      "polish",
      "deslop",
      "expand",
      "character_audit",
      "fact_consistency",
      "book_synopsis_expand",
    ];

    if (!allowedKeys.includes(functionKey as AiFunctionKey)) {
      return jsonError(`不支持的 functionKey: ${functionKey}`);
    }

    try {
      const startTime = Date.now();

      // 1. Build context via ContextBuilder
      const builtContext = await buildContext({
        bookId,
        chapterId: str(payload.chapterId),
        characterId: str(payload.characterId),
        functionKey: functionKey as AiFunctionKey,
        selectedText: str(payload.selectedText),
        extraVariables:
          typeof payload.extraVariables === "object" &&
          payload.extraVariables !== null
            ? (payload.extraVariables as Record<string, string>)
            : undefined,
      });

      // 2. Log context for debugging
      console.log("\n========== AI CONTEXT LOG ==========");
      console.log(`[Function] ${builtContext.functionKey}`);
      console.log(`[Book] ${builtContext.metadata.bookTitle}`);
      if (builtContext.metadata.chapterTitle) {
        console.log(`[Chapter] ${builtContext.metadata.chapterTitle}`);
      }
      console.log(`[Estimated Tokens] ${builtContext.estimatedTokens}`);
      console.log("--- System Prompt ---");
      console.log(builtContext.systemPrompt);
      console.log("--- User Prompt ---");
      console.log(builtContext.userPrompt);
      console.log("========== END CONTEXT ==========\n");

      // 3. Call AI with built context
      const input: AiTextTaskInput = {
        prompt: builtContext.userPrompt,
        systemPrompt: builtContext.systemPrompt,
        temperature:
          typeof payload.temperature === "number"
            ? payload.temperature
            : undefined,
        model: str(payload.model),
      };

      const content = await generateAiText(input);
      const latencyMs = Date.now() - startTime;

      // 3. Record the generation session (fire-and-forget; don't fail the
      //    response if session recording throws)
      try {
        await createGenerationSession({
          bookId,
          functionKey,
          chapterId: str(payload.chapterId),
          inputContext: builtContext.userPrompt,
          model: input.model ?? "",
          userInput: builtContext.userPrompt,
        });
      } catch {
        // session recording is best-effort
      }

      return NextResponse.json({
        success: true,
        content,
        metadata: {
          functionKey: builtContext.functionKey,
          estimatedTokens: builtContext.estimatedTokens,
          latencyMs,
          bookTitle: builtContext.metadata.bookTitle,
          chapterTitle: builtContext.metadata.chapterTitle,
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        return jsonError(error.message, 502);
      }
      return jsonError("AI 调用失败。", 502);
    }
  }

  // ------------------------------------------------------------------
  // Mode 1: Legacy direct-prompt flow
  // ------------------------------------------------------------------
  const input: AiTextTaskInput = {
    prompt: typeof payload.prompt === "string" ? payload.prompt.trim() : "",
    systemPrompt:
      typeof payload.systemPrompt === "string" ? payload.systemPrompt : undefined,
    temperature:
      typeof payload.temperature === "number" ? payload.temperature : undefined,
    model: typeof payload.model === "string" ? payload.model : undefined,
  };

  if (!input.prompt) {
    return jsonError("prompt 不能为空。");
  }

  try {
    const content = await generateAiText(input);
    return NextResponse.json({ success: true, content });
  } catch (error) {
    if (error instanceof Error) {
      return jsonError(error.message, 502);
    }

    return jsonError("AI 调用失败。", 502);
  }
}
