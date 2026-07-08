import { loadPublicAiConfig, saveAiConfig } from "@/server/ai/ai-config-store";
import { sanitizeAdvancedConfig } from "@/shared/ai/config-contracts";
import { jsonSuccess, jsonError } from "@/app/api/utils";

export async function GET() {
  try {
    const config = await loadPublicAiConfig();
    return jsonSuccess({ success: true, config });
  } catch (error) {
    console.error("Failed to load AI config:", error);
    return jsonError("配置加载失败");
  }
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

    const result = await saveAiConfig({
      providerId,
      apiKey,
      baseUrl,
      model,
      contextSize: contextSize ? Number(contextSize) : undefined,
      temperature: temperature ? Number(temperature) : undefined,
      advancedConfig: advancedConfig ? sanitizeAdvancedConfig(advancedConfig) : undefined,
    });

    return jsonSuccess({ success: true, config: result });
  } catch (error) {
    console.error("Failed to save AI config:", error);
    return jsonError("配置保存失败，请检查输入参数");
  }
}
