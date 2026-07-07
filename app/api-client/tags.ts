import { client } from "./client";
import type { Result } from "./client";
import type {
  TagCategory,
  CreateTagCategoryDTO,
  UpdateTagCategoryDTO,
} from "@/app/types";

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

/** 获取单个标签 */
export async function getTag(
  id: string
): Promise<Result<TagCategory | null>> {
  const res = await client.get<{ tag: TagCategory | null }>(
    `/api/tags/${id}`
  );
  if (!res.ok) return res;
  return { ok: true, data: res.data.tag ?? null };
}

/** 创建标签 */
export async function createTag(
  bookId: string,
  data: CreateTagCategoryDTO
): Promise<Result<TagCategory>> {
  const res = await client.post<{ tag: TagCategory }>(
    "/api/tags",
    { bookId, ...data }
  );
  if (!res.ok) return res;
  return { ok: true, data: res.data.tag };
}

/** 更新标签 */
export async function updateTag(
  id: string,
  data: UpdateTagCategoryDTO
): Promise<Result<TagCategory>> {
  const res = await client.put<{ tag: TagCategory }, typeof data>(
    `/api/tags/${id}`,
    data
  );
  if (!res.ok) return res;
  return { ok: true, data: res.data.tag };
}

/** 删除标签 */
export async function deleteTag(id: string): Promise<Result<void>> {
  return client.delete(`/api/tags/${id}`);
}

/** 获取标签引用计数 */
export async function getTagRefCount(
  tagId: string
): Promise<Result<{ count: number }>> {
  return client.get<{ count: number }>(`/api/tags/${tagId}/refs`);
}
