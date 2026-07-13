import { NextResponse } from "next/server";
import { jsonError } from "@/app/api/utils";
import type { AiTextTaskInput } from "@/shared/ai/contracts";
import { generateAiText } from "@/server/ai/generate-ai-text";
import { generateAiTextStream } from "@/server/ai/generate-ai-text-stream";
import { buildContext, type AiFunctionKey } from "@/server/ai/context-builder";
import {
  createGenerationSession,
  updateGenerationSession,
} from "@/server/storage/ai-generation-store";

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

      console.log(`[AI Chat] functionKey=${functionKey}, bookId=${bookId}`);

      // 2. Call AI — streaming or non-streaming
      const input: AiTextTaskInput = {
        prompt: builtContext.userPrompt,
        systemPrompt: builtContext.systemPrompt,
        temperature:
          typeof payload.temperature === "number"
            ? payload.temperature
            : undefined,
        model: str(payload.model),
      };

      const wantStream = payload.stream === true;

      console.log(`[AI Chat] stream=${wantStream}, systemPrompt(${builtContext.systemPrompt.length} chars)=${builtContext.systemPrompt.slice(0, 80)}..., userPrompt(${builtContext.userPrompt.length} chars)=${builtContext.userPrompt.slice(0, 80)}...`);

      if (wantStream) {
        // --- Streaming mode: pipe upstream SSE through to the client ---
        const upstream = await generateAiTextStream(input);

        // Create session first so we have an ID to update later
        let sessionId = "";
        try {
          const session = await createGenerationSession({
            bookId,
            functionKey,
            chapterId: str(payload.chapterId),
            inputContext: builtContext.systemPrompt,
            model: input.model ?? "",
            userInput: builtContext.userPrompt,
          });
          sessionId = session.id;
        } catch (e) {
          console.error("[AI Chat] Failed to create generation session (streaming):", e);
        }

        const encoder = new TextEncoder();
        let accumulatedOutput = "";
        let streamFinished = false;

        const stream = new TransformStream({
          transform(chunk: Uint8Array, controller) {
            const text = new TextDecoder().decode(chunk, { stream: true });
            const lines = text.split("\n");
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith("data: ")) continue;
              const data = trimmed.slice(6);
              if (data === "[DONE]") {
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                continue;
              }
              try {
                const parsed = JSON.parse(data) as {
                  choices?: Array<{
                    delta?: { content?: string };
                  }>;
                };
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  accumulatedOutput += content;
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ content })}\n\n`),
                  );
                }
              } catch {
                // skip unparseable lines
              }
            }
          },
          flush() {
            streamFinished = true;
          },
        });

        const transformed = upstream.body?.pipeThrough(stream);
        if (!transformed) {
          return new Response("No upstream body", { status: 500 });
        }

        // Tee the stream: one for client, one for logging
        const [clientStream, logStream] = transformed.tee();

        // Fire-and-forget: consume logStream to update session after completion
        if (sessionId) {
          const reader = logStream.getReader();
          const consumeForLog = async () => {
            try {
              // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
              while (true) {
                const { done } = await reader.read();
                if (done) break;
              }
            } catch {
              // client disconnected — still update
            }
            if (streamFinished && accumulatedOutput) {
              void updateGenerationSession(sessionId, {
                rawOutput: accumulatedOutput,
                latencyMs: Date.now() - startTime,
              }).catch(() => {});
            }
          };
          void consumeForLog();
        }

        return new Response(clientStream, {
          status: 200,
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      }

      // --- Non-streaming mode ---
      const content = await generateAiText(input);
      const latencyMs = Date.now() - startTime;

      // 3. Record the generation session (fire-and-forget; don't fail the
      //    response if session recording throws)
      try {
        await createGenerationSession({
          bookId,
          functionKey,
          chapterId: str(payload.chapterId),
          inputContext: builtContext.systemPrompt,
          model: input.model ?? "",
          userInput: builtContext.userPrompt,
          rawOutput: content,
          latencyMs,
        });
      } catch (e) {
        console.error("[AI Chat] Failed to create generation session (non-streaming):", e);
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
