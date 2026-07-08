import { client } from "@/app/api-client";
import type { Result } from "@/app/api-client";
import type {
  SettingEntity,
  CreateSettingEntityDTO,
  UpdateSettingEntityDTO,
} from "@/app/types";

export async function fetchSettingEntities(
  bookId: string,
  category?: string
): Promise<Result<SettingEntity[]>> {
  const params: Record<string, string> = { bookId };
  if (category) params.category = category;
  const res = await client.get<{ entities: SettingEntity[] }>(
    "/api/setting-entities",
    params
  );
  if (!res.ok) return res;
  return { ok: true, data: res.data.entities ?? [] };
}

export async function getSettingEntity(
  id: string
): Promise<Result<SettingEntity | null>> {
  const res = await client.get<{ entity: SettingEntity | null }>(
    `/api/setting-entities/${id}`
  );
  if (!res.ok) return res;
  return { ok: true, data: res.data.entity ?? null };
}

export async function createSettingEntity(
  bookId: string,
  data: CreateSettingEntityDTO
): Promise<Result<SettingEntity>> {
  const res = await client.post<{ entity: SettingEntity }>(
    "/api/setting-entities",
    { bookId, ...data }
  );
  if (!res.ok) return res;
  return { ok: true, data: res.data.entity };
}

export async function updateSettingEntity(
  id: string,
  data: UpdateSettingEntityDTO
): Promise<Result<SettingEntity>> {
  const res = await client.patch<{ entity: SettingEntity }, typeof data>(
    `/api/setting-entities/${id}`,
    data
  );
  if (!res.ok) return res;
  return { ok: true, data: res.data.entity };
}

export async function deleteSettingEntity(id: string): Promise<Result<void>> {
  return client.delete(`/api/setting-entities/${id}`);
}
