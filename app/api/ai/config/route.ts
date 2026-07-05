import { NextResponse } from "next/server";
import { loadPublicAiConfig, saveAiConfig } from "@/server/ai/ai-config-store";
import { sanitizeAdvancedConfig } from "@/shared/ai/config-contracts";

export async function GET() {
  const config = loadPublicAiConfig();
  return NextResponse.json({ success: true, config });
}

export async function POST(request: Request) {
  try {
    const rawBody = (await request.json()) as Record<string, unknown>;
    const dangerousTopKeys = ["__proto__", "constructor", "prototype"];
    const body: Record<string, unknown> = {};

    for (const key of Object.keys(rawBody)) {
      if (dangerousTopKeys.includes(key)) {
        continue;
      }

      body[key] = rawBody[key];
    }

    const { providerId, apiKey, baseUrl, model, contextSize, temperature, advancedConfig } = body as {
      providerId?: string;
      apiKey?: string;
      baseUrl?: string;
      model?: string;
      contextSize?: number;
      temperature?: number;
      advancedConfig?: Record<string, unknown>;
    };

    const result = saveAiConfig({
      providerId,
      apiKey,
      baseUrl,
      model,
      contextSize: contextSize ? Number(contextSize) : undefined,
      temperature: temperature ? Number(temperature) : undefined,
      advancedConfig: advancedConfig ? sanitizeAdvancedConfig(advancedConfig) : undefined,
    });

    return NextResponse.json({ success: true, config: result });
  } catch (error) {
    console.error("Failed to save AI config:", error);
    return NextResponse.json(
      { success: false, error: "配置保存失败，请检查输入参数" },
      { status: 500 }
    );
  }
}
