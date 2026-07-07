import { client } from "@/app/api-client";
import type { Result } from "@/app/api-client";
import type { AiConfig, SaveAiConfigDTO } from "@/app/types";

export async function getAiConfig(): Promise<Result<AiConfig>> {
  const res = await client.get<{ success: boolean; config: AiConfig }>("/api/ai/config");
  if (!res.ok) return res;
  return { ok: true, data: res.data.config };
}

export async function saveAiConfig(data: SaveAiConfigDTO): Promise<Result<AiConfig>> {
  const res = await client.post<{ success: boolean; config: AiConfig }, SaveAiConfigDTO>(
    "/api/ai/config",
    data
  );
  if (!res.ok) return res;
  return { ok: true, data: res.data.config };
}

export async function fetchModels(params: {
  providerId: string;
  baseUrl: string;
  apiKey: string;
}): Promise<Result<{ success: boolean; models: string[]; message?: string }>> {
  return client.post("/api/ai/models", params);
}

export async function testConnection(params: {
  providerId: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  apiFormat: string;
}): Promise<Result<{ success: boolean; message: string }>> {
  return client.post("/api/ai/test", params);
}
