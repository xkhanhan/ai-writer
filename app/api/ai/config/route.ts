import { NextResponse } from "next/server";
import { getPublicAiConfig, saveAiConfig } from "@/lib/ai/config";

function jsonError(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

export async function GET() {
  try {
    const config = await getPublicAiConfig();
    return NextResponse.json({ success: true, config });
  } catch {
    return jsonError("AI 配置读取失败。", 500);
  }
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

  const apiKey = typeof payload.apiKey === "string" ? payload.apiKey : "";
  const baseUrl = typeof payload.baseUrl === "string" ? payload.baseUrl : "";
  const model = typeof payload.model === "string" ? payload.model : "";

  try {
    await saveAiConfig({ apiKey, baseUrl, model });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      return jsonError(error.message);
    }

    return jsonError("AI 配置保存失败。", 500);
  }
}
