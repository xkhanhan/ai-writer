import { readJsonFile, writeJsonFile } from "@/lib/storage/file";

type StoredAiConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
};

function getDefaultAiConfig(): StoredAiConfig {
  return {
    apiKey: process.env.AI_API_KEY?.trim() ?? "",
    baseUrl: process.env.AI_BASE_URL?.trim() || "https://api.openai.com/v1",
    model: process.env.AI_MODEL?.trim() || "gpt-4o-mini"
  };
}

export async function getStoredAiConfig() {
  return readJsonFile<StoredAiConfig>("ai-config.json", getDefaultAiConfig());
}

export async function getPublicAiConfig() {
  const config = await getStoredAiConfig();

  return {
    baseUrl: config.baseUrl,
    model: config.model,
    hasApiKey: Boolean(config.apiKey)
  };
}

export async function saveAiConfig(input: StoredAiConfig) {
  const current = await getStoredAiConfig();
  const baseUrl = input.baseUrl.trim();
  const model = input.model.trim();
  const apiKey = input.apiKey.trim();

  if (!baseUrl) {
    throw new Error("AI_BASE_URL 不能为空。");
  }

  if (!model) {
    throw new Error("AI_MODEL 不能为空。");
  }

  if (!current.apiKey && !apiKey) {
    throw new Error("AI_API_KEY 不能为空。");
  }

  const nextConfig: StoredAiConfig = {
    apiKey: apiKey || current.apiKey,
    baseUrl,
    model
  };

  await writeJsonFile("ai-config.json", nextConfig);
}
