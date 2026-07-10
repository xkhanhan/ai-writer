import { loadInternalConfig } from "@/server/ai/ai-config-store";
import {
  defaultAiSystemPrompt,
  type AiTextTaskInput,
} from "@/shared/ai/contracts";

/**
 * Call an OpenAI-compatible API and return a raw streaming Response.
 * The caller is responsible for reading the SSE stream.
 */
export async function generateAiTextStream(
  input: AiTextTaskInput,
): Promise<Response> {
  const prompt = input.prompt.trim();
  if (!prompt) {
    throw new Error("prompt 不能为空。");
  }

  const config = await loadInternalConfig();
  if (!config.apiKey) {
    throw new Error("请先配置 AI_API_KEY。");
  }

  const advanced = config.advanced;
  const baseUrl = config.baseUrl || advanced.baseUrl;
  const model = config.model || advanced.model;
  const temperature = input.temperature ?? advanced.temperature;

  if (temperature < 0 || temperature > 2) {
    throw new Error("temperature 必须在 0 到 2 之间。");
  }

  const response = await fetch(
    `${baseUrl.replace(/\/$/, "")}/chat/completions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        ...advanced.headers,
      },
      body: JSON.stringify({
        model: input.model?.trim() || model,
        messages: [
          {
            role: "system",
            content: input.systemPrompt?.trim() || defaultAiSystemPrompt,
          },
          { role: "user", content: prompt },
        ],
        temperature,
        top_p: advanced.topP,
        stream: true,
        ...(advanced.maxTokens !== null
          ? { max_tokens: advanced.maxTokens }
          : {}),
        ...advanced.extraBody,
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    let msg = `AI 平台请求失败：${response.status}`;
    try {
      const parsed = JSON.parse(body) as { error?: { message?: string } };
      msg = parsed.error?.message ?? msg;
    } catch {
      // use default
    }
    throw new Error(msg);
  }

  return response;
}
