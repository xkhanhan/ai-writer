import { client } from "@/app/api-client";
import type { Result } from "@/app/api-client";
import type { AiConfig, SaveAiConfigDTO } from "@/app/types";

export type AiConfigStatus = "idle" | "connected" | "error";

export interface AiConfigRecord {
  id: string;
  name: string;
  provider: string;
  providerName: string;
  apiFormat: string;
  baseUrl: string;
  apiKey: string | null;
  model: string;
  contextSize: number;
  temperature: number;
  status: AiConfigStatus;
  updatedAt: string;
}

// --- Legacy single-config (kept for backward compatibility) ---

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

// --- Multi-config CRUD ---

export async function getAiConfigList(): Promise<Result<AiConfigRecord[]>> {
  const res = await client.get<{ success: boolean; configs: AiConfigRecord[] }>(
    "/api/ai/config"
  );
  if (!res.ok) return res;
  return { ok: true, data: res.data.configs ?? [] };
}

export async function createAiConfigRecord(
  data: Omit<AiConfigRecord, "id" | "updatedAt" | "status">
): Promise<Result<AiConfigRecord>> {
  const res = await client.post<{ success: boolean; config: AiConfigRecord }, typeof data>(
    "/api/ai/config",
    data
  );
  if (!res.ok) return res;
  return { ok: true, data: res.data.config };
}

export async function updateAiConfigRecord(
  id: string,
  data: Partial<Omit<AiConfigRecord, "id" | "updatedAt">>
): Promise<Result<AiConfigRecord>> {
  const res = await client.put<{ success: boolean; config: AiConfigRecord }, Record<string, unknown>>(
    "/api/ai/config",
    { id, ...data } as Record<string, unknown>
  );
  if (!res.ok) return res;
  return { ok: true, data: res.data.config };
}

export async function deleteAiConfigRecord(
  id: string
): Promise<Result<void>> {
  try {
    const res = await fetch("/api/ai/config", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { ok: false, error: (err as { error?: string }).error ?? "删除失败" };
    }
    return { ok: true, data: undefined as unknown as void };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "网络错误" };
  }
}

// --- Model & Connection ---

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
