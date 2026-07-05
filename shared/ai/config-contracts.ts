export type AiAdvancedConfig = {
  baseUrl: string;
  model: string;
  temperature: number;
  topP: number;
  maxTokens: number | null;
  contextSize: number;
  headers: Record<string, string>;
  extraBody: Record<string, unknown>;
};

export type PublicAiConfig = {
  providerId: string;
  hasApiKey: boolean;
  baseUrl: string;
  model: string;
  contextSize: number;
  temperature: number;
  advancedConfig: AiAdvancedConfig;
};

export type SaveAiConfigInput = {
  providerId?: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  contextSize?: number;
  temperature?: number;
  advancedConfig?: AiAdvancedConfig;
};

export const AI_CONFIG_DEFAULTS: AiAdvancedConfig = {
  baseUrl: "https://api.openai.com/v1",
  model: "gpt-4o-mini",
  temperature: 0.8,
  topP: 1,
  maxTokens: 4096,
  contextSize: 4096,
  headers: {},
  extraBody: {},
};

export const DEFAULT_AI_CONFIG = AI_CONFIG_DEFAULTS;

function sanitizeRecordKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeRecordKeys(item));
  }

  if (value && typeof value === "object") {
    const source = value as Record<string, unknown>;
    const target: Record<string, unknown> = {};

    for (const key of Object.keys(source)) {
      if (["__proto__", "constructor", "prototype"].includes(key)) {
        continue;
      }

      target[key] = sanitizeRecordKeys(source[key]);
    }

    return target;
  }

  return value;
}

export function sanitizeAdvancedConfig(input: Record<string, unknown>): AiAdvancedConfig {
  const defaults = AI_CONFIG_DEFAULTS;
  const safeInput = sanitizeRecordKeys(input) as Record<string, unknown>;

  const headers =
    safeInput.headers && typeof safeInput.headers === "object" && !Array.isArray(safeInput.headers)
      ? (safeInput.headers as Record<string, string>)
      : defaults.headers;

  const extraBody =
    safeInput.extraBody && typeof safeInput.extraBody === "object" && !Array.isArray(safeInput.extraBody)
      ? (safeInput.extraBody as Record<string, unknown>)
      : defaults.extraBody;

  return {
    baseUrl: typeof safeInput.baseUrl === "string" ? safeInput.baseUrl : defaults.baseUrl,
    model: typeof safeInput.model === "string" ? safeInput.model : defaults.model,
    temperature: typeof safeInput.temperature === "number" ? safeInput.temperature : defaults.temperature,
    topP: typeof safeInput.topP === "number" ? safeInput.topP : defaults.topP,
    maxTokens: typeof safeInput.maxTokens === "number" ? safeInput.maxTokens : defaults.maxTokens,
    contextSize: typeof safeInput.contextSize === "number" ? safeInput.contextSize : defaults.contextSize,
    headers,
    extraBody,
  };
}
