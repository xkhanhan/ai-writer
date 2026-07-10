import {
  type AiTextTaskInput,
} from "@/shared/ai/contracts";
import { loadInternalConfig } from "@/server/ai/ai-config-store";

export type ResolvedAiConfig = {
  baseUrl: string;
  model: string;
  temperature: number;
  topP: number;
  apiKey: string;
  headers: Record<string, string>;
  maxTokens: number | null;
  extraBody: Record<string, unknown>;
};

/**
 * Resolve AI config from user input, validate, and return ready-to-use values.
 * Throws if prompt is empty, API key is missing, or temperature is out of range.
 */
export async function resolveAiConfig(
  input: AiTextTaskInput,
): Promise<ResolvedAiConfig> {
  const prompt = input.prompt.trim();
  if (!prompt) {
    throw new Error("prompt 不能为空。");
  }

  const config = await loadInternalConfig();

  if (!config.apiKey) {
    throw new Error("请先配置 AI_API_KEY。");
  }

  const advanced = config.advanced;
  const baseUrl = config.baseUrl || (advanced?.baseUrl ?? "");
  const model = config.model || (advanced?.model ?? "");
  const temperature = input.temperature ?? advanced?.temperature ?? 0.7;
  const topP = advanced?.topP ?? 1;

  if (temperature < 0 || temperature > 2) {
    throw new Error("temperature 必须在 0 到 2 之间。");
  }

  return {
    baseUrl,
    model,
    temperature,
    topP,
    apiKey: config.apiKey,
    headers: advanced?.headers ?? {},
    maxTokens: advanced?.maxTokens ?? null,
    extraBody: advanced?.extraBody ?? {},
  };
}
