import { NextResponse } from "next/server";
import { sendChatPrompt } from "@/lib/ai/client";

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
  const prompt = typeof payload.prompt === "string" ? payload.prompt.trim() : "";

  if (!prompt) {
    return jsonError("prompt 不能为空。");
  }

  try {
    const content = await sendChatPrompt(prompt);
    return NextResponse.json({ success: true, content });
  } catch (error) {
    if (error instanceof Error) {
      return jsonError(error.message, 502);
    }

    return jsonError("AI 调用失败。", 502);
  }
}
