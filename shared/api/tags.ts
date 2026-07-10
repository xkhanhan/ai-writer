import { client } from "@/app/api-client/client";
import type { Result } from "@/app/api-client/client";
import type { TagCategory } from "@/shared/types";

/** 获取标签树（级联结构） */
export async function fetchTagTree(
  bookId: string
): Promise<Result<TagCategory[]>> {
  const res = await client.get<{ tags: TagCategory[] }>(
    "/api/tags",
    { bookId }
  );
  if (!res.ok) return res;
  return { ok: true, data: res.data.tags ?? [] };
}
