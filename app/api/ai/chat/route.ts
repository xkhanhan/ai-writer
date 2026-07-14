import { NextResponse } from "next/server";
import { generateText, streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { jsonError } from "@/app/api/utils";
import { buildContext, type AiFunctionKey } from "@/server/ai/context-builder";
import { loadInternalConfig } from "@/server/ai/ai-config-store";
import {
  createGenerationSession,
  updateGenerationSession,
} from "@/server/storage/ai-generation-store";
import { logAiOp, logger } from "@/server/logger";
import { defaultAiSystemPrompt } from "@/shared/ai/contracts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Helper to extract a string from the parsed body. */
function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/** Load AI config and create a ready-to-use OpenAI provider. */
async function createProvider() {
  const aiConfig = await loadInternalConfig();

  if (!aiConfig.apiKey) {
    throw new Error("请先在设置中配置 AI API Key");
  }

  const openai = createOpenAI({
    apiKey: aiConfig.apiKey,
    baseURL: aiConfig.baseUrl,
    ...(aiConfig.advanced?.headers ? { headers: aiConfig.advanced.headers } : {}),
  });

  return {
    openai,
    model: aiConfig.model,
    temperature: aiConfig.temperature,
    topP: aiConfig.advanced?.topP ?? 1,
    maxTokens: aiConfig.advanced?.maxTokens ?? null,
  };
}

// ---------------------------------------------------------------------------
// POST Handler
// ---------------------------------------------------------------------------

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
      "book_info_suggest",
      "world_rule_suggest",
      "outline_optimize",
      "volume_generate",
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

      logAiOp("AI 调用开始", {
        functionKey,
        bookId,
        stream: payload.stream === true,
      });

      // 2. Resolve AI config and create provider
      const provider = await createProvider();
      const systemPrompt = builtContext.systemPrompt || defaultAiSystemPrompt;
      const userPrompt = builtContext.userPrompt;
      const temperature =
        typeof payload.temperature === "number"
          ? payload.temperature
          : provider.temperature;
      const model = str(payload.model) ?? provider.model;

      logAiOp("AI 上下文构建完成", {
        functionKey,
        stream: payload.stream === true,
        systemPromptLen: builtContext.systemPrompt.length,
        userPromptLen: builtContext.userPrompt.length,
        estimatedTokens: builtContext.estimatedTokens,
      });

      const wantStream = payload.stream === true;

      if (wantStream) {
        // --- Streaming mode: pipe text chunks as SSE to the client ---
        // Create session first so we have an ID to update later
        let sessionId = "";
        try {
          const session = await createGenerationSession({
            bookId,
            functionKey,
            chapterId: str(payload.chapterId),
            inputContext: builtContext.systemPrompt,
            model,
            userInput: builtContext.userPrompt,
          });
          sessionId = session.id;
        } catch (e) {
          logger.error("ai", "创建生成会话失败（流式）", {
            error: e instanceof Error ? e.message : String(e),
          });
        }

        const result = streamText({
          model: provider.openai(model),
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
          temperature,
          topP: provider.topP,
          ...(provider.maxTokens ? { maxTokens: provider.maxTokens } : {}),
        });

        const encoder = new TextEncoder();
        let accumulatedOutput = "";

        const stream = new ReadableStream({
          async start(controller) {
            try {
              for await (const chunk of result.textStream) {
                accumulatedOutput += chunk;
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ content: chunk })}\n\n`,
                  ),
                );
              }
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();

              // Update session after stream completes
              if (sessionId && accumulatedOutput) {
                void updateGenerationSession(sessionId, {
                  rawOutput: accumulatedOutput,
                  latencyMs: Date.now() - startTime,
                }).catch(() => {});
              }
            } catch (err) {
              controller.error(err);
            }
          },
        });

        return new Response(stream, {
          status: 200,
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      }

      // --- Non-streaming mode ---
      const result = await generateText({
        model: provider.openai(model),
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
        temperature,
        topP: provider.topP,
        ...(provider.maxTokens ? { maxTokens: provider.maxTokens } : {}),
      });

      const content = result.text;
      const latencyMs = Date.now() - startTime;

      // 3. Record the generation session (fire-and-forget; don't fail the
      //    response if session recording throws)
      try {
        await createGenerationSession({
          bookId,
          functionKey,
          chapterId: str(payload.chapterId),
          inputContext: builtContext.systemPrompt,
          model,
          userInput: builtContext.userPrompt,
          rawOutput: content,
          latencyMs,
        });
      } catch (e) {
        logger.error("ai", "创建生成会话失败（非流式）", {
          error: e instanceof Error ? e.message : String(e),
        });
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
        debug: {
          systemPrompt: builtContext.systemPrompt,
          userPrompt: builtContext.userPrompt,
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
  const prompt =
    typeof payload.prompt === "string" ? payload.prompt.trim() : "";
  const systemPrompt =
    typeof payload.systemPrompt === "string" ? payload.systemPrompt : undefined;
  const reqTemperature =
    typeof payload.temperature === "number" ? payload.temperature : undefined;
  const reqModel =
    typeof payload.model === "string" ? payload.model : undefined;

  if (!prompt) {
    return jsonError("prompt 不能为空。");
  }

  try {
    const provider = await createProvider();

    const result = await generateText({
      model: provider.openai(reqModel ?? provider.model),
      system: systemPrompt ?? defaultAiSystemPrompt,
      messages: [{ role: "user", content: prompt }],
      temperature: reqTemperature ?? provider.temperature,
      topP: provider.topP,
      ...(provider.maxTokens ? { maxTokens: provider.maxTokens } : {}),
    });

    return NextResponse.json({ success: true, content: result.text });
  } catch (error) {
    if (error instanceof Error) {
      return jsonError(error.message, 502);
    }
    return jsonError("AI 调用失败。", 502);
  }
}
