import { client } from "@/app/api-client";
import type {
  SettingEntity,
  CreateSettingEntityDTO,
  UpdateSettingEntityDTO,
} from "@/app/types";

export async function fetchSettingEntities(
  bookId: string,
  category?: string
): Promise<SettingEntity[]> {
  const params: Record<string, string> = { bookId };
  if (category) params.category = category;
  const res = await client.get<{ entities: SettingEntity[] }>(
    "/api/setting-entities",
    params
  );
  return res.entities ?? [];
}

export async function getSettingEntity(
  id: string
): Promise<SettingEntity | null> {
  const res = await client.get<{ entity: SettingEntity | null }>(
    `/api/setting-entities/${id}`
  );
  return res.entity ?? null;
}

export async function createSettingEntity(
  bookId: string,
  data: CreateSettingEntityDTO
): Promise<SettingEntity> {
  const res = await client.post<{ entity: SettingEntity }>(
    "/api/setting-entities",
    { bookId, ...data }
  );
  return res.entity;
}

export async function updateSettingEntity(
  id: string,
  data: UpdateSettingEntityDTO
): Promise<SettingEntity> {
  const res = await client.put<{ entity: SettingEntity }, typeof data>(
    `/api/setting-entities/${id}`,
    data
  );
  return res.entity;
}

export async function deleteSettingEntity(id: string): Promise<void> {
  await client.delete(`/api/setting-entities/${id}`);
}
