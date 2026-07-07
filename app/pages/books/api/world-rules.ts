import { client } from "@/app/api-client";
import type { Result } from "@/app/api-client";
import type { WorldRule, CreateWorldRuleDTO, UpdateWorldRuleDTO } from "@/app/types";

export async function fetchWorldRules(
  bookId: string,
  category?: string
): Promise<Result<WorldRule[]>> {
  const params: Record<string, string> = { bookId };
  if (category) params.category = category;
  const res = await client.get<{ rules: WorldRule[] }>("/api/world-rules", params);
  if (!res.ok) return res;
  return { ok: true, data: res.data.rules ?? [] };
}

export async function getWorldRule(id: string): Promise<Result<WorldRule | null>> {
  const res = await client.get<{ rule: WorldRule | null }>(`/api/world-rules/${id}`);
  if (!res.ok) return res;
  return { ok: true, data: res.data.rule ?? null };
}

export async function createWorldRule(
  bookId: string,
  data: CreateWorldRuleDTO
): Promise<Result<WorldRule>> {
  const res = await client.post<{ rule: WorldRule }>("/api/world-rules", {
    bookId,
    ...data,
  });
  if (!res.ok) return res;
  return { ok: true, data: res.data.rule };
}

export async function updateWorldRule(
  id: string,
  data: UpdateWorldRuleDTO
): Promise<Result<WorldRule>> {
  const res = await client.put<{ rule: WorldRule }, typeof data>(
    `/api/world-rules/${id}`,
    data
  );
  if (!res.ok) return res;
  return { ok: true, data: res.data.rule };
}

export async function deleteWorldRule(id: string): Promise<Result<void>> {
  return client.delete(`/api/world-rules/${id}`);
}
