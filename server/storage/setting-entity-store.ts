import { randomUUID } from "node:crypto";
import { getDb } from "@/server/storage/db";
import { parseJsonSafe } from "@/server/utils/json";
import { buildUpdateSet } from "@/server/utils/store-helpers";
import type {
  SettingEntity,
  SettingCategory,
  CreateSettingEntityDTO,
  UpdateSettingEntityDTO,
} from "@/shared/types";

// ============ Row 类型 ============

type SettingEntityRow = {
  id: string;
  book_id: string;
  category: string;
  name: string;
  level: string;
  description: string;
  appearance: string;
  traits: string;
  background: string;
  abilities: string;
  weaknesses: string;
  tag_ids: string;
  category_fields: string;
  status_fields: string;
  deprecated: number;
  created_at: string;
  updated_at: string;
};

// ============ 映射函数 ============

function mapSettingEntity(row: SettingEntityRow): SettingEntity {
  return {
    id: row.id,
    bookId: row.book_id,
    category: row.category as SettingCategory,
    name: row.name,
    level: (row.level as SettingEntity["level"]) || "general",
    description: row.description,
    appearance: row.appearance,
    traits: row.traits,
    background: row.background,
    abilities: row.abilities,
    weaknesses: row.weaknesses,
    tagIds: parseJsonSafe<string[]>(row.tag_ids, []),
    categoryFields: parseJsonSafe<Record<string, string>>(
      row.category_fields,
      {}
    ),
    statusFields: parseJsonSafe<Record<string, string>>(
      row.status_fields,
      {}
    ),
    deprecated: row.deprecated === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============ 查询 ============

export async function getSettingEntitiesByBookId(
  bookId: string,
  category?: SettingCategory
): Promise<SettingEntity[]> {
  const db = await getDb();
  let rows: SettingEntityRow[];
  if (category) {
    rows = db
      .prepare(
        "SELECT * FROM setting_entities WHERE book_id = ? AND category = ? ORDER BY level ASC, created_at ASC"
      )
      .all(bookId, category) as SettingEntityRow[];
  } else {
    rows = db
      .prepare(
        "SELECT * FROM setting_entities WHERE book_id = ? ORDER BY category ASC, level ASC, created_at ASC"
      )
      .all(bookId) as SettingEntityRow[];
  }
  return rows.map(mapSettingEntity);
}

export async function getSettingEntityById(
  id: string
): Promise<SettingEntity | null> {
  const db = await getDb();
  const row = db
    .prepare("SELECT * FROM setting_entities WHERE id = ?")
    .get(id) as SettingEntityRow | undefined;
  return row ? mapSettingEntity(row) : null;
}

// ============ 创建 ============

export async function createSettingEntity(
  bookId: string,
  data: CreateSettingEntityDTO
): Promise<SettingEntity> {
  const db = await getDb();
  const id = randomUUID();

  db.prepare(
    `INSERT INTO setting_entities (id, book_id, category, name, level, description, appearance, traits, background, abilities, weaknesses, tag_ids, category_fields, status_fields)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    bookId,
    data.category,
    data.name,
    data.level ?? "general",
    data.description ?? "",
    data.appearance ?? "",
    data.traits ?? "",
    data.background ?? "",
    data.abilities ?? "",
    data.weaknesses ?? "",
    JSON.stringify(data.tagIds ?? []),
    JSON.stringify(data.categoryFields ?? {}),
    JSON.stringify(data.statusFields ?? {})
  );

  return (await getSettingEntityById(id))!;
}

// ============ 更新 ============

export async function updateSettingEntity(
  id: string,
  data: UpdateSettingEntityDTO
): Promise<SettingEntity | null> {
  const db = await getDb();
  const fieldMap = {
    name: data.name,
    level: data.level,
    description: data.description,
    appearance: data.appearance,
    traits: data.traits,
    background: data.background,
    abilities: data.abilities,
    weaknesses: data.weaknesses,
    tag_ids: data.tagIds !== undefined ? JSON.stringify(data.tagIds) : undefined,
    category_fields: data.categoryFields !== undefined ? JSON.stringify(data.categoryFields) : undefined,
    status_fields: data.statusFields !== undefined ? JSON.stringify(data.statusFields) : undefined,
    deprecated: data.deprecated !== undefined ? (data.deprecated ? 1 : 0) : undefined,
  };

  const update = buildUpdateSet("setting_entities", fieldMap, ["updated_at = datetime('now')"]);
  if (!update) return getSettingEntityById(id);

  db.prepare(update.sql).run(...update.values, id);
  return getSettingEntityById(id);
}

// ============ 删除 ============

export async function deleteSettingEntity(id: string): Promise<boolean> {
  const db = await getDb();
  const result = db
    .prepare("DELETE FROM setting_entities WHERE id = ?")
    .run(id);
  return result.changes > 0;
}
