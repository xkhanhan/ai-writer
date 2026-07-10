import {
  defaultAiSystemPrompt,
  type AiTextTaskInput,
} from "@/shared/ai/contracts";
import { resolveAiConfig } from "@/server/ai/ai-config-helpers";

/**
 * Call an OpenAI-compatible API and return a raw streaming Response.
 * The caller is responsible for reading the SSE stream.
 */
export async function generateAiTextStream(
  input: AiTextTaskInput,
): Promise<Response> {
  const cfg = await resolveAiConfig(input);

  const prompt = input.prompt.trim();

  const response = await fetch(
    `${cfg.baseUrl.replace(/\/$/, "")}/chat/completions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        "Content-Type": "application/json",
        ...cfg.headers,
      },
      body: JSON.stringify({
        model: input.model?.trim() || cfg.model,
        messages: [
          {
            role: "system",
            content: input.systemPrompt?.trim() || defaultAiSystemPrompt,
          },
          { role: "user", content: prompt },
        ],
        temperature: cfg.temperature,
        top_p: cfg.topP,
        stream: true,
        ...(cfg.maxTokens !== null
          ? { max_tokens: cfg.maxTokens }
          : {}),
        ...cfg.extraBody,
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
