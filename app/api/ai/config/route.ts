import {
  getAiConfigs,
  getAiConfig,
  createAiConfig,
  updateAiConfig,
  deleteAiConfig,
  loadPublicAiConfig,
  saveAiConfig,
} from "@/server/ai/ai-config-store";
import { sanitizeAdvancedConfig } from "@/shared/ai/config-contracts";
import { jsonSuccess, jsonError } from "@/app/api/utils";

// GET /api/ai/config — list all configs, or single config if ?id= is provided
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (id) {
      const config = await getAiConfig(id);
      if (!config) return jsonError("配置不存在", 404);
      return jsonSuccess({ success: true, config });
    }

    const configs = await getAiConfigs();
    return jsonSuccess({ success: true, configs });
  } catch (error) {
    console.error("Failed to load AI config:", error);
    return jsonError("配置加载失败");
  }
}

// POST /api/ai/config — create a new config
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

    const { name, provider, providerName, apiFormat, baseUrl, apiKey, model, contextSize, temperature, advancedConfig } = body as {
      name?: string;
      provider?: string;
      providerName?: string;
      apiFormat?: string;
      baseUrl?: string;
      apiKey?: string;
      model?: string;
      contextSize?: number;
      temperature?: number;
      advancedConfig?: Record<string, unknown>;
    };

    const record = await createAiConfig({
      name: name ?? "新建配置",
      provider: provider ?? "openai",
      providerName: providerName ?? "OpenAI",
      apiFormat: apiFormat ?? "openai",
      baseUrl: baseUrl ?? "",
      apiKey: apiKey ?? null,
      model: model ?? "gpt-4o-mini",
      contextSize: contextSize ? Number(contextSize) : 128000,
      temperature: temperature ? Number(temperature) : 0.7,
      advanced: advancedConfig ? sanitizeAdvancedConfig(advancedConfig) : undefined,
      status: "idle",
    });

    return jsonSuccess({ success: true, config: record }, 201);
  } catch (error) {
    console.error("Failed to create AI config:", error);
    return jsonError("配置创建失败，请检查输入参数");
  }
}

// PUT /api/ai/config — update an existing config (id in body)
export async function PUT(request: Request) {
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

    const { id, name, provider, providerName, apiFormat, baseUrl, apiKey, model, contextSize, temperature, advancedConfig, status } = body as {
      id?: string;
      name?: string;
      provider?: string;
      providerName?: string;
      apiFormat?: string;
      baseUrl?: string;
      apiKey?: string;
      model?: string;
      contextSize?: number;
      temperature?: number;
      advancedConfig?: Record<string, unknown>;
      status?: "idle" | "connected" | "error";
    };

    if (!id) {
      return jsonError("缺少配置 id");
    }

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (provider !== undefined) updates.provider = provider;
    if (providerName !== undefined) updates.providerName = providerName;
    if (apiFormat !== undefined) updates.apiFormat = apiFormat;
    if (baseUrl !== undefined) updates.baseUrl = baseUrl;
    if (apiKey !== undefined) updates.apiKey = apiKey;
    if (model !== undefined) updates.model = model;
    if (contextSize !== undefined) updates.contextSize = Number(contextSize);
    if (temperature !== undefined) updates.temperature = Number(temperature);
    if (advancedConfig !== undefined) updates.advanced = sanitizeAdvancedConfig(advancedConfig);
    if (status !== undefined) updates.status = status;

    const updated = await updateAiConfig(id, updates);
    if (!updated) return jsonError("配置不存在", 404);

    return jsonSuccess({ success: true, config: updated });
  } catch (error) {
    console.error("Failed to update AI config:", error);
    return jsonError("配置更新失败，请检查输入参数");
  }
}

// DELETE /api/ai/config — delete a config (id in body)
export async function DELETE(request: Request) {
  try {
    const rawBody = (await request.json()) as Record<string, unknown>;
    const { id } = rawBody as { id?: string };

    if (!id) {
      return jsonError("缺少配置 id");
    }

    const deleted = await deleteAiConfig(id);
    if (!deleted) return jsonError("配置不存在", 404);

    return jsonSuccess({ success: true });
  } catch (error) {
    console.error("Failed to delete AI config:", error);
    return jsonError("配置删除失败");
  }
}
