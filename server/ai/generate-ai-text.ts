import {
  defaultAiSystemPrompt,
  type AiTextTaskInput
} from "@/shared/ai/contracts";
import { resolveAiConfig } from "@/server/ai/ai-config-helpers";

type OpenAiCompatibleResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

export async function generateAiText(input: AiTextTaskInput) {
  const cfg = await resolveAiConfig(input);

  const prompt = input.prompt.trim();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);
  let response: Response;
  try {
    response = await fetch(
      `${cfg.baseUrl.replace(/\/$/, "")}/chat/completions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfg.apiKey}`,
          "Content-Type": "application/json",
          ...cfg.headers
        },
        body: JSON.stringify({
          model: input.model?.trim() || cfg.model,
          messages: [
            {
              role: "system",
              content: input.systemPrompt?.trim() || defaultAiSystemPrompt
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: cfg.temperature,
          top_p: cfg.topP,
          ...(cfg.maxTokens !== null ? { max_tokens: cfg.maxTokens } : {}),
          ...cfg.extraBody
        }),
        signal: controller.signal
      }
    );
  } finally {
    clearTimeout(timer);
  }

  const data = (await response.json()) as OpenAiCompatibleResponse;

  if (!response.ok) {
    throw new Error(data.error?.message ?? `AI 平台请求失败：${response.status}`);
  }

  const content = data.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error("AI 平台没有返回可展示内容。");
  }

  return content;
}
