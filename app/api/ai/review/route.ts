import { NextResponse } from "next/server";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { jsonError } from "@/app/api/utils";
import { buildContext } from "@/server/ai/context-builder";
import { loadInternalConfig } from "@/server/ai/ai-config-store";
import {
  createGenerationSession,
  updateGenerationSession,
} from "@/server/storage/ai-generation-store";
import { parseAiJson } from "@/shared/utils/parse-ai-json";
import { defaultAiSystemPrompt } from "@/shared/ai/contracts";

// ============================================================================
// Types
// ============================================================================

interface ReviewRequestBody {
  bookId?: string;
  chapterId?: string;
}

interface ReviewExtractedData {
  facts: Array<{
    content: string;
    chapterNumber: number;
    relatedCharacters: string[];
  }>;
  foreshadowChanges: Array<{
    action: "plant" | "resolve";
    name: string;
    description: string;
  }>;
  characterStates: Array<{
    name: string;
    changes: {
      location?: string;
      knownInfo?: string[];
      relationship?: string;
    };
  }>;
  itemStates: Array<{
    name: string;
    changes: {
      status: string;
    };
  }>;
}

interface ReviewSuccessResponse {
  success: true;
  data: ReviewExtractedData;
  metadata: {
    model: string;
    tokensInput: number;
    tokensOutput: number;
    latencyMs: number;
  };
  debug?: {
    systemPrompt: string;
    userPrompt: string;
  };
}

interface ReviewFallbackResponse {
  success: true;
  data: null;
  rawOutput: string;
  warning: string;
}

// ============================================================================
// Helpers
// ============================================================================

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

// ============================================================================
// Route Handler
// ============================================================================

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("请求体必须是 JSON。");
  }

  const payload =
    typeof body === "object" && body !== null
      ? (body as ReviewRequestBody)
      : {};

  const bookId = str(payload.bookId);
  const chapterId = str(payload.chapterId);

  if (!bookId) {
    return jsonError("bookId 为必填字段。");
  }
  if (!chapterId) {
    return jsonError("chapterId 为必填字段。");
  }

  let sessionCreated: { id: string } | null = null;

  try {
    const startTime = Date.now();

    // 1. Load AI config and create provider
    const aiConfig = await loadInternalConfig();

    if (!aiConfig.apiKey) {
      return jsonError("请先在设置中配置 AI API Key", 400);
    }

    const openai = createOpenAI({
      apiKey: aiConfig.apiKey,
      baseURL: aiConfig.baseUrl,
      ...(aiConfig.advanced?.headers
        ? { headers: aiConfig.advanced.headers }
        : {}),
    });

    // 2. Build review context
    const builtContext = await buildContext({
      bookId,
      chapterId,
      functionKey: "review_extract",
    });

    // 3. Call AI with Vercel AI SDK
    const result = await generateText({
      model: openai(aiConfig.model),
      system: builtContext.systemPrompt || defaultAiSystemPrompt,
      messages: [{ role: "user", content: builtContext.userPrompt }],
      temperature: aiConfig.temperature,
      ...(aiConfig.advanced?.topP !== undefined
        ? { topP: aiConfig.advanced.topP }
        : {}),
      ...(aiConfig.advanced?.maxTokens
        ? { maxTokens: aiConfig.advanced.maxTokens }
        : {}),
    });

    const content = result.text;
    const latencyMs = Date.now() - startTime;

    // 4. Parse AI response as structured JSON
    const parseResult = parseAiJson<ReviewExtractedData>(content);

    // 5. Record the generation session (best-effort)
    try {
      sessionCreated = await createGenerationSession({
        bookId,
        functionKey: "review_extract",
        chapterId,
        inputContext: builtContext.userPrompt,
        userInput: builtContext.userPrompt,
      });
    } catch {
      // session recording is best-effort
    }

    // 6. Build and return response
    if (parseResult.ok) {
      const response: ReviewSuccessResponse = {
        success: true,
        data: parseResult.data,
        metadata: {
          model: aiConfig.model,
          tokensInput: builtContext.estimatedTokens,
          tokensOutput: 0,
          latencyMs,
        },
        debug: {
          systemPrompt: builtContext.systemPrompt,
          userPrompt: builtContext.userPrompt,
        },
      };

      // Update session with output stats (best-effort)
      if (sessionCreated?.id) {
        try {
          await updateGenerationSession(sessionCreated.id, {
            rawOutput: content,
            latencyMs,
          });
        } catch {
          // best-effort
        }
      }

      return NextResponse.json(response);
    }

    // JSON parsing failed — return raw output with warning
    const fallback: ReviewFallbackResponse = {
      success: true,
      data: null,
      rawOutput: content,
      warning: parseResult.warning,
    };

    // Update session with raw output (best-effort)
    if (sessionCreated?.id) {
      try {
        await updateGenerationSession(sessionCreated.id, {
          rawOutput: content,
          latencyMs,
        });
      } catch {
        // best-effort
      }
    }

    return NextResponse.json(fallback);
  } catch (error) {
    if (error instanceof Error) {
      return jsonError(error.message, 502);
    }
    return jsonError("AI 审阅提取调用失败。", 502);
  }
}
