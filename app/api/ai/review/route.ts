import { NextResponse } from "next/server";
import { buildContext } from "@/server/ai/context-builder";
import { generateAiText } from "@/server/ai/generate-ai-text";
import {
  createGenerationSession,
  updateGenerationSession,
} from "@/server/storage/ai-generation-store";

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
}

interface ReviewFallbackResponse {
  success: true;
  data: null;
  rawOutput: string;
  warning: string;
}

// ============================================================================
// JSON Parsing Helpers
// ============================================================================

/**
 * Attempt to parse the AI response as JSON.
 *
 * Strategy:
 *   1. Try direct JSON.parse()
 *   2. Try extracting JSON from markdown code blocks (```json ... ```)
 *   3. Fall back with a warning
 */
function parseAiJsonResponse(
  raw: string,
): { ok: true; data: ReviewExtractedData } | { ok: false; warning: string } {
  // Attempt 1: Direct parse
  try {
    const parsed = JSON.parse(raw) as ReviewExtractedData;
    return { ok: true, data: parsed };
  } catch {
    // continue to attempt 2
  }

  // Attempt 2: Extract from markdown code blocks
  const codeBlockMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch?.[1]) {
    try {
      const parsed = JSON.parse(codeBlockMatch[1]) as ReviewExtractedData;
      return { ok: true, data: parsed };
    } catch {
      // continue to fallback
    }
  }

  // Attempt 3: Try to find a JSON object anywhere in the response
  const jsonStart = raw.indexOf("{");
  const jsonEnd = raw.lastIndexOf("}");
  if (jsonStart !== -1 && jsonEnd > jsonStart) {
    try {
      const extracted = raw.slice(jsonStart, jsonEnd + 1);
      const parsed = JSON.parse(extracted) as ReviewExtractedData;
      return { ok: true, data: parsed };
    } catch {
      // continue to fallback
    }
  }

  return {
    ok: false,
    warning: "AI 返回的内容无法解析为结构化 JSON",
  };
}

// ============================================================================
// Helpers
// ============================================================================

function jsonError(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

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

    // 1. Build review context
    const builtContext = await buildContext({
      bookId,
      chapterId,
      functionKey: "review_extract",
    });

    // 2. Call AI
    const content = await generateAiText({
      prompt: builtContext.userPrompt,
      systemPrompt: builtContext.systemPrompt,
    });

    const latencyMs = Date.now() - startTime;

    // 3. Parse AI response as structured JSON
    const parseResult = parseAiJsonResponse(content);

    // 4. Record the generation session (best-effort)
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

    // 5. Build and return response
    if (parseResult.ok) {
      const response: ReviewSuccessResponse = {
        success: true,
        data: parseResult.data,
        metadata: {
          model: "unknown",
          tokensInput: builtContext.estimatedTokens,
          tokensOutput: 0,
          latencyMs,
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
