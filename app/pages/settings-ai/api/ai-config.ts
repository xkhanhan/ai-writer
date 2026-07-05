import { client } from "@/app/api-client";
import type { AiConfig, SaveAiConfigDTO } from "@/app/types";

export async function getAiConfig(): Promise<AiConfig> {
  const res = await client.get<{ success: boolean; config: AiConfig }>("/api/ai/config");
  return res.config;
}

export async function saveAiConfig(data: SaveAiConfigDTO): Promise<AiConfig> {
  const res = await client.post<{ success: boolean; config: AiConfig }, SaveAiConfigDTO>(
    "/api/ai/config",
    data
  );
  return res.config;
}

export async function fetchModels(params: {
  providerId: string;
  baseUrl: string;
  apiKey: string;
}): Promise<{ success: boolean; models: string[]; message?: string }> {
  return client.post("/api/ai/models", params);
}

export async function testConnection(params: {
  providerId: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  apiFormat: string;
}): Promise<{ success: boolean; message: string }> {
  return client.post("/api/ai/test", params);
}
