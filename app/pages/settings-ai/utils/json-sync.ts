import type { AiAdvancedConfig } from "@/shared/ai/config-contracts";

interface BasicConfig {
  baseUrl: string;
  model: string;
  contextSize: number;
  temperature: number;
}

export function syncToAdvancedJson(
  basicConfig: BasicConfig,
  existingAdvanced: Partial<AiAdvancedConfig> = {}
): string {
  const advanced: AiAdvancedConfig = {
    baseUrl: basicConfig.baseUrl,
    model: basicConfig.model,
    temperature: basicConfig.temperature,
    topP: existingAdvanced.topP ?? 1,
    maxTokens: existingAdvanced.maxTokens ?? null,
    contextSize: basicConfig.contextSize,
    headers: existingAdvanced.headers ?? {},
    extraBody: existingAdvanced.extraBody ?? {},
  };

  return JSON.stringify(advanced, null, 2);
}

export function syncFromAdvancedJson(json: string): Partial<BasicConfig> | null {
  try {
    const parsed = JSON.parse(json);

    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }

    const result: Partial<BasicConfig> = {};

    if (typeof parsed.baseUrl === "string") {
      result.baseUrl = parsed.baseUrl;
    }
    if (typeof parsed.model === "string") {
      result.model = parsed.model;
    }
    if (typeof parsed.temperature === "number") {
      result.temperature = parsed.temperature;
    }
    if (typeof parsed.contextSize === "number") {
      result.contextSize = parsed.contextSize;
    } else if (typeof parsed.maxTokens === "number") {
      result.contextSize = parsed.maxTokens;
    }

    return Object.keys(result).length > 0 ? result : null;
  } catch {
    return null;
  }
}
