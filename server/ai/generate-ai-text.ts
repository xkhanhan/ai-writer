import {
  defaultAiSystemPrompt,
  type AiTextTaskInput
} from "@/shared/ai/contracts";
import { loadInternalConfig } from "@/server/ai/ai-config-store";

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
  const prompt = input.prompt.trim();
  if (!prompt) {
    throw new Error("prompt 不能为空。");
  }

  const config = await loadInternalConfig();

  if (!config.apiKey) {
    throw new Error("请先配置 AI_API_KEY。");
  }

  const advanced = config.advanced;
  const temperature = input.temperature ?? advanced.temperature;
  const topP = advanced.topP;

  if (temperature < 0 || temperature > 2) {
    throw new Error("temperature 必须在 0 到 2 之间。");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  let response: Response;
  try {
    response = await fetch(
      `${advanced.baseUrl.replace(/\/$/, "")}/chat/completions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
          ...advanced.headers
        },
        body: JSON.stringify({
          model: input.model?.trim() || advanced.model,
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
          temperature,
          top_p: topP,
          ...(advanced.maxTokens !== null ? { max_tokens: advanced.maxTokens } : {}),
          ...advanced.extraBody
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
