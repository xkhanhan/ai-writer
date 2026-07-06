import { client } from "@/app/api-client";
import type { WorldRule, CreateWorldRuleDTO, UpdateWorldRuleDTO } from "@/app/types";

export async function fetchWorldRules(
  bookId: string,
  category?: string
): Promise<WorldRule[]> {
  const params: Record<string, string> = { bookId };
  if (category) params.category = category;
  const res = await client.get<{ rules: WorldRule[] }>("/api/world-rules", params);
  return res.rules ?? [];
}

export async function getWorldRule(id: string): Promise<WorldRule | null> {
  const res = await client.get<{ rule: WorldRule | null }>(`/api/world-rules/${id}`);
  return res.rule ?? null;
}

export async function createWorldRule(
  bookId: string,
  data: CreateWorldRuleDTO
): Promise<WorldRule> {
  const res = await client.post<{ rule: WorldRule }>("/api/world-rules", {
    bookId,
    ...data,
  });
  return res.rule;
}

export async function updateWorldRule(
  id: string,
  data: UpdateWorldRuleDTO
): Promise<WorldRule> {
  const res = await client.put<{ rule: WorldRule }, typeof data>(
    `/api/world-rules/${id}`,
    data
  );
  return res.rule;
}

export async function deleteWorldRule(id: string): Promise<void> {
  await client.delete(`/api/world-rules/${id}`);
}
