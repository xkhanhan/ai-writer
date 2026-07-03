import { getStoredAiConfig } from "@/lib/ai/config";

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

export async function sendChatPrompt(prompt: string) {
  const input = prompt.trim();
  if (!input) {
    throw new Error("prompt 不能为空。");
  }

  const config = await getStoredAiConfig();

  if (!config.apiKey) {
    throw new Error("请先配置 AI_API_KEY。");
  }

  const response = await fetch(
    `${config.baseUrl.replace(/\/$/, "")}/chat/completions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: "system",
            content:
              "You are a writing assistant. Complete only the current prompt and do not claim to maintain project state."
          },
          {
            role: "user",
            content: input
          }
        ],
        temperature: 0.8
      })
    }
  );

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
