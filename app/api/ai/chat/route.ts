import { NextResponse } from "next/server";
import type { AiTextTaskInput } from "@/shared/ai/contracts";
import { generateAiText } from "@/server/ai/generate-ai-text";

function jsonError(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
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

  const input: AiTextTaskInput = {
    prompt: typeof payload.prompt === "string" ? payload.prompt.trim() : "",
    systemPrompt:
      typeof payload.systemPrompt === "string" ? payload.systemPrompt : undefined,
    temperature:
      typeof payload.temperature === "number" ? payload.temperature : undefined,
    model: typeof payload.model === "string" ? payload.model : undefined
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
