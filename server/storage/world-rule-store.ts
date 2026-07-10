import { randomUUID } from "node:crypto";
import { getDb } from "@/server/storage/db";
import { parseJsonArray } from "@/server/utils/json";
import { buildUpdateSet } from "@/server/utils/store-helpers";
import type { WorldRule, CreateWorldRuleDTO, UpdateWorldRuleDTO } from "@/shared/types";

// ============ Row 类型 ============

type WorldRuleRow = {
  id: string;
  book_id: string;
  category: string;
  name: string;
  content: string;
  is_fixed: number;
  setting_type: string;
  select_options: string;
  number_min: number | null;
  number_max: number | null;
  number_unit: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

// ============ 映射函数 ============

function mapWorldRule(row: WorldRuleRow): WorldRule {
  const selectOptions = parseJsonArray(row.select_options);
  return {
    id: row.id,
    bookId: row.book_id,
    category: row.category as WorldRule["category"],
    name: row.name,
    content: row.content,
    isFixed: row.is_fixed === 1,
    settingType: (row.setting_type as WorldRule["settingType"]) || "",
    selectOptions,
    numberMin: row.number_min ?? 0,
    numberMax: row.number_max ?? 0,
    numberUnit: row.number_unit,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============ 查询 ============

export async function getWorldRulesByBookId(
  bookId: string,
  category?: WorldRule["category"]
): Promise<WorldRule[]> {
  const db = await getDb();
  let rows: WorldRuleRow[];
  if (category) {
    rows = db
      .prepare(
        "SELECT * FROM world_rules WHERE book_id = ? AND category = ? ORDER BY sort_order ASC, created_at ASC"
      )
      .all(bookId, category) as WorldRuleRow[];
  } else {
    rows = db
      .prepare(
        "SELECT * FROM world_rules WHERE book_id = ? ORDER BY category ASC, sort_order ASC, created_at ASC"
      )
      .all(bookId) as WorldRuleRow[];
  }
  return rows.map(mapWorldRule);
}

export async function getWorldRuleById(id: string): Promise<WorldRule | null> {
  const db = await getDb();
  const row = db
    .prepare("SELECT * FROM world_rules WHERE id = ?")
    .get(id) as WorldRuleRow | undefined;
  return row ? mapWorldRule(row) : null;
}

// ============ 创建 ============

export async function createWorldRule(
  bookId: string,
  data: CreateWorldRuleDTO
): Promise<WorldRule> {
  const db = await getDb();
  const id = randomUUID();

  // 获取同分类下最大排序值（使用子查询保证原子性）
  db.prepare(
    `INSERT INTO world_rules (id, book_id, category, name, content, is_fixed, setting_type, select_options, number_min, number_max, number_unit, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM world_rules WHERE book_id = ? AND category = ?))`
  ).run(
    id,
    bookId,
    data.category,
    data.name,
    data.content ?? "",
    data.isFixed ? 1 : 0,
    data.settingType ?? "",
    JSON.stringify(data.selectOptions ?? []),
    data.numberMin ?? null,
    data.numberMax ?? null,
    data.numberUnit ?? "",
    bookId,
    data.category
  );

  return (await getWorldRuleById(id))!;
}

// ============ 更新 ============

export async function updateWorldRule(
  id: string,
  data: UpdateWorldRuleDTO
): Promise<WorldRule | null> {
  const db = await getDb();
  const fieldMap = {
    name: data.name,
    content: data.content,
    is_fixed: data.isFixed !== undefined ? (data.isFixed ? 1 : 0) : undefined,
    setting_type: data.settingType,
    select_options: data.selectOptions !== undefined ? JSON.stringify(data.selectOptions) : undefined,
    number_min: data.numberMin,
    number_max: data.numberMax,
    number_unit: data.numberUnit,
    sort_order: data.sortOrder,
  };

  const update = buildUpdateSet("world_rules", fieldMap, ["updated_at = datetime('now')"]);
  if (!update) return getWorldRuleById(id);

  db.prepare(update.sql).run(...update.values, id);
  return getWorldRuleById(id);
}

// ============ 删除 ============

export async function deleteWorldRule(id: string): Promise<boolean> {
  const db = await getDb();
  const result = db.prepare("DELETE FROM world_rules WHERE id = ?").run(id);
  return result.changes > 0;
}

// ============ 排序 ============

export async function reorderWorldRules(
  bookId: string,
  category: WorldRule["category"],
  ruleIds: string[]
): Promise<void> {
  const db = await getDb();
  const stmt = db.prepare("UPDATE world_rules SET sort_order = ?, updated_at = datetime('now') WHERE id = ? AND book_id = ?");
  const transaction = db.transaction(() => {
    ruleIds.forEach((id, index) => {
      stmt.run(index, id, bookId);
    });
  });
  transaction();
}

// ============ 固定规则初始化 ============

const FIXED_GLOBAL_RULES = [
  {
    name: "政治合规",
    content:
      "本作品不包含政治敏感内容，不涉及真实政治人物、政治事件或政治立场的表达。作品中的国家、宗门等设定均为虚构，不代表任何现实政治实体。",
  },
];

export async function ensureFixedGlobalRules(bookId: string): Promise<void> {
  const db = await getDb();
  const existing = db
    .prepare("SELECT id FROM world_rules WHERE book_id = ? AND is_fixed = 1 AND category = 'global' LIMIT 1")
    .get(bookId) as { id: string } | undefined;

  if (!existing) {
    const tx = db.transaction(() => {
      for (let i = 0; i < FIXED_GLOBAL_RULES.length; i++) {
        const rule = FIXED_GLOBAL_RULES[i];
        const id = randomUUID();
        db.prepare(
          `INSERT INTO world_rules (id, book_id, category, name, content, is_fixed, sort_order)
           VALUES (?, ?, 'global', ?, ?, 1, ?)`
        ).run(id, bookId, rule.name, rule.content, i);
      }
    });
    tx();
  }
}
