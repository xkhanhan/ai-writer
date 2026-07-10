import { randomUUID } from "node:crypto";
import { getDb } from "@/server/storage/db";
import { parseJsonSafe } from "@/server/utils/json";
import type {
  TagCategory,
  CreateTagCategoryDTO,
  UpdateTagCategoryDTO,
} from "@/shared/types";

// ============ Row 类型 ============

type TagCategoryRow = {
  id: string;
  book_id: string;
  parent_id: string | null;
  name: string;
  code: string;
  description: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

// ============ 映射函数 ============

function mapTagCategory(row: TagCategoryRow): TagCategory {
  return {
    id: row.id,
    bookId: row.book_id,
    name: row.name,
    code: row.code,
    parentId: row.parent_id ?? undefined,
    description: row.description || undefined,
    sortOrder: row.sort_order,
  };
}

interface TreeNode extends TagCategory {
  _kids: TreeNode[];
}

/** 将扁平列表构建为树形结构 */
function buildTree(rows: TagCategory[]): TagCategory[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  // 先创建所有节点
  for (const row of rows) {
    map.set(row.id, { ...row, _kids: [] });
  }

  // 建立父子关系
  for (const row of rows) {
    const node = map.get(row.id)!;
    if (row.parentId && map.has(row.parentId)) {
      map.get(row.parentId)!._kids.push(node);
    } else {
      roots.push(node);
    }
  }

  // 清理
  const clean = (nodes: TreeNode[]): TagCategory[] =>
    nodes
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((n) => ({
        ...n,
        children: n._kids.length > 0 ? clean(n._kids) : undefined,
      }));

  return clean(roots);
}

// ============ 查询 ============

/** 获取某本书的全部标签（扁平列表） */
export async function getTagCategoriesByBookId(
  bookId: string
): Promise<TagCategory[]> {
  const db = await getDb();
  const rows = db
    .prepare(
      "SELECT * FROM tag_categories WHERE book_id = ? ORDER BY sort_order ASC, created_at ASC"
    )
    .all(bookId) as TagCategoryRow[];
  return rows.map(mapTagCategory);
}

/** 获取某本书的全部标签（树形结构） */
export async function getTagTreeByBookId(
  bookId: string
): Promise<TagCategory[]> {
  const flat = await getTagCategoriesByBookId(bookId);
  return buildTree(flat);
}

/** 获取单个标签 */
export async function getTagCategoryById(
  id: string
): Promise<TagCategory | null> {
  const db = await getDb();
  const row = db
    .prepare("SELECT * FROM tag_categories WHERE id = ?")
    .get(id) as TagCategoryRow | undefined;
  return row ? mapTagCategory(row) : null;
}

// ============ 编码生成 ============

/** 根据名称生成 URL-safe 编码（简单实现，后续可接入 pinyin 库） */
function generateCode(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** 确保同级 code 唯一，冲突时追加数字后缀 */
function uniqueCode(
  db: ReturnType<typeof getDb> extends Promise<infer T> ? T : never,
  bookId: string,
  parentId: string | null,
  baseCode: string
): string {
  let code = baseCode;
  let suffix = 1;

  for (let attempt = 0; attempt < 100; attempt++) {
    const whereParent = parentId
      ? "AND parent_id = ?"
      : "AND parent_id IS NULL";
    const args = parentId ? [bookId, parentId, code] : [bookId, code];
    const existing = db
      .prepare(
        `SELECT id FROM tag_categories WHERE book_id = ? ${whereParent} AND code = ?`
      )
      .get(...args) as { id: string } | undefined;

    if (!existing) return code;
    code = `${baseCode}-${suffix}`;
    suffix++;
  }
  throw new Error(`无法生成唯一编码（bookId=${bookId}, baseCode=${baseCode}），已尝试 100 次`);
}

// ============ 创建 ============

export async function createTagCategory(
  bookId: string,
  data: CreateTagCategoryDTO
): Promise<TagCategory> {
  const db = await getDb();
  const id = randomUUID();

  // 系统自动生成编码（忽略用户输入）
  const baseCode = generateCode(data.name);
  const code = uniqueCode(db, bookId, data.parentId ?? null, baseCode);

  // 计算 sort_order：同级下最大的 + 1（使用子查询保证原子性）
  if (data.parentId) {
    db.prepare(
      `INSERT INTO tag_categories (id, book_id, parent_id, name, code, description, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM tag_categories WHERE parent_id = ? AND book_id = ?))`
    ).run(id, bookId, data.parentId, data.name, code, data.description ?? "", data.parentId, bookId);
  } else {
    db.prepare(
      `INSERT INTO tag_categories (id, book_id, parent_id, name, code, description, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM tag_categories WHERE parent_id IS NULL AND book_id = ?))`
    ).run(id, bookId, data.parentId ?? null, data.name, code, data.description ?? "", bookId);
  }

  return (await getTagCategoryById(id))!;
}

// ============ 更新 ============

export async function updateTagCategory(
  id: string,
  data: UpdateTagCategoryDTO
): Promise<TagCategory | null> {
  const db = await getDb();
  const fields: string[] = [];
  const values: Array<string | number> = [];

  if (data.name !== undefined) {
    fields.push("name = ?");
    values.push(data.name);
  }
  if (data.code !== undefined) {
    fields.push("code = ?");
    values.push(data.code);
  }
  if (data.parentId !== undefined) {
    if (data.parentId) {
      fields.push("parent_id = ?");
      values.push(data.parentId);
    } else {
      fields.push("parent_id = NULL");
    }
  }
  if (data.description !== undefined) {
    fields.push("description = ?");
    values.push(data.description);
  }
  if (data.sortOrder !== undefined) {
    fields.push("sort_order = ?");
    values.push(data.sortOrder);
  }

  if (fields.length === 0) return getTagCategoryById(id);

  fields.push("updated_at = datetime('now')");
  values.push(id);

  db.prepare(
    `UPDATE tag_categories SET ${fields.join(", ")} WHERE id = ?`
  ).run(...values);
  return getTagCategoryById(id);
}

// ============ 引用统计 ============

/** 统计某个标签被多少个设定实体引用 */
export async function countTagRefs(
  bookId: string,
  tagId: string
): Promise<number> {
  const db = await getDb();
  const rows = db
    .prepare("SELECT tag_ids FROM setting_entities WHERE book_id = ?")
    .all(bookId) as { tag_ids: string }[];

  let count = 0;
  for (const row of rows) {
    const ids: string[] = parseJsonSafe<string[]>(row.tag_ids, []);
    if (ids.includes(tagId)) count++;
  }
  return count;
}

// ============ 关联清理 ============

/** 清理 setting_entities 中的孤立标签引用 */
async function cleanOrphanRefs(
  bookId: string,
  deletedIds: string[]
): Promise<void> {
  if (deletedIds.length === 0) return;
  const db = await getDb();
  const rows = db
    .prepare("SELECT id, tag_ids FROM setting_entities WHERE book_id = ?")
    .all(bookId) as { id: string; tag_ids: string }[];

  const deletedSet = new Set(deletedIds);

  for (const row of rows) {
    const ids: string[] = parseJsonSafe<string[]>(row.tag_ids, []);
    const filtered = ids.filter((id) => !deletedSet.has(id));
    if (filtered.length !== ids.length) {
      db.prepare("UPDATE setting_entities SET tag_ids = ?, updated_at = datetime('now') WHERE id = ?")
        .run(JSON.stringify(filtered), row.id);
    }
  }
}

// ============ 删除 ============

/** 收集所有需要删除的节点 ID（含子节点） */
function collectDescendantIds(db: Awaited<ReturnType<typeof getDb>>, parentId: string): string[] {
  const ids: string[] = [];
  const children = db
    .prepare("SELECT id FROM tag_categories WHERE parent_id = ?")
    .all(parentId) as { id: string }[];
  for (const child of children) {
    ids.push(child.id);
    ids.push(...collectDescendantIds(db, child.id));
  }
  return ids;
}

export async function deleteTagCategory(id: string): Promise<boolean> {
  const db = await getDb();

  // 先获取标签的 bookId
  const tag = db
    .prepare("SELECT book_id FROM tag_categories WHERE id = ?")
    .get(id) as { book_id: string } | undefined;
  if (!tag) return false;

  // 收集所有要删除的 ID（含子节点）
  const allIds = [id, ...collectDescendantIds(db, id)];

  const result = db.transaction(() => {
    // 递归删除所有子节点
    const deleteChildren = (parentId: string) => {
      const children = db
        .prepare("SELECT id FROM tag_categories WHERE parent_id = ?")
        .all(parentId) as { id: string }[];
      for (const child of children) {
        deleteChildren(child.id);
      }
      db.prepare("DELETE FROM tag_categories WHERE parent_id = ?").run(parentId);
    };

    deleteChildren(id);
    return db.prepare("DELETE FROM tag_categories WHERE id = ?").run(id);
  })();

  // 级联清理 setting_entities 中的孤立引用
  await cleanOrphanRefs(tag.book_id, allIds);

  return result.changes > 0;
}
