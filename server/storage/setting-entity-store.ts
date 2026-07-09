import { randomUUID } from "node:crypto";
import { getDb } from "@/server/storage/db";
import { parseJsonSafe } from "@/server/utils/json";
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
  const fields: string[] = [];
  const values: Array<string | number> = [];

  if (data.name !== undefined) {
    fields.push("name = ?");
    values.push(data.name);
  }
  if (data.level !== undefined) {
    fields.push("level = ?");
    values.push(data.level);
  }
  if (data.description !== undefined) {
    fields.push("description = ?");
    values.push(data.description);
  }
  if (data.appearance !== undefined) {
    fields.push("appearance = ?");
    values.push(data.appearance);
  }
  if (data.traits !== undefined) {
    fields.push("traits = ?");
    values.push(data.traits);
  }
  if (data.background !== undefined) {
    fields.push("background = ?");
    values.push(data.background);
  }
  if (data.abilities !== undefined) {
    fields.push("abilities = ?");
    values.push(data.abilities);
  }
  if (data.weaknesses !== undefined) {
    fields.push("weaknesses = ?");
    values.push(data.weaknesses);
  }
  if (data.tagIds !== undefined) {
    fields.push("tag_ids = ?");
    values.push(JSON.stringify(data.tagIds));
  }
  if (data.categoryFields !== undefined) {
    fields.push("category_fields = ?");
    values.push(JSON.stringify(data.categoryFields));
  }
  if (data.statusFields !== undefined) {
    fields.push("status_fields = ?");
    values.push(JSON.stringify(data.statusFields));
  }
  if (data.deprecated !== undefined) {
    fields.push("deprecated = ?");
    values.push(data.deprecated ? 1 : 0);
  }

  if (fields.length === 0) return getSettingEntityById(id);

  fields.push("updated_at = datetime('now')");
  values.push(id);

  db.prepare(
    `UPDATE setting_entities SET ${fields.join(", ")} WHERE id = ?`
  ).run(...values);
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
