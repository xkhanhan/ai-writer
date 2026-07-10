import { randomUUID } from "node:crypto";
import { getDb } from "@/server/storage/db";
import { buildUpdateSet } from "@/server/utils/store-helpers";
import type {
  Foreshadow,
  CreateForeshadowDTO,
  UpdateForeshadowDTO,
} from "@/shared/types";

// ============ Row 类型 ============

type ForeshadowRow = {
  id: string;
  book_id: string;
  name: string;
  description: string;
  status: string;
  chapter_id: string;
  chapter_number: number | null;
  volume_id: string;
  created_at: string;
  updated_at: string;
};

// ============ 映射函数 ============

function mapForeshadow(row: ForeshadowRow): Foreshadow {
  return {
    id: row.id,
    bookId: row.book_id,
    name: row.name,
    description: row.description,
    status: row.status as Foreshadow["status"],
    chapterId: row.chapter_id || undefined,
    chapterNumber: row.chapter_number ?? undefined,
    volumeId: row.volume_id || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============ 查询 ============

export async function getForeshadowsByBookId(
  bookId: string
): Promise<Foreshadow[]> {
  const db = await getDb();
  const rows = db
    .prepare(
      "SELECT * FROM foreshadows WHERE book_id = ? ORDER BY chapter_number ASC NULLS LAST, created_at ASC"
    )
    .all(bookId) as ForeshadowRow[];
  return rows.map(mapForeshadow);
}

export async function getForeshadowById(
  id: string
): Promise<Foreshadow | null> {
  const db = await getDb();
  const row = db
    .prepare("SELECT * FROM foreshadows WHERE id = ?")
    .get(id) as ForeshadowRow | undefined;
  return row ? mapForeshadow(row) : null;
}

// ============ 创建 ============

export async function createForeshadow(
  bookId: string,
  data: CreateForeshadowDTO
): Promise<Foreshadow> {
  const db = await getDb();
  const id = randomUUID();

  db.prepare(
    `INSERT INTO foreshadows (id, book_id, name, description, status, chapter_id, chapter_number, volume_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    bookId,
    data.name,
    data.description ?? "",
    data.status ?? "hidden",
    data.chapterId ?? "",
    data.chapterNumber ?? null,
    data.volumeId ?? ""
  );

  return (await getForeshadowById(id))!;
}

// ============ 更新 ============

export async function updateForeshadow(
  id: string,
  data: UpdateForeshadowDTO
): Promise<Foreshadow | null> {
  const db = await getDb();
  const fieldMap = {
    name: data.name,
    description: data.description,
    status: data.status,
    chapter_id: data.chapterId,
    chapter_number: data.chapterNumber,
    volume_id: data.volumeId,
  };

  const update = buildUpdateSet("foreshadows", fieldMap, [
    "updated_at = datetime('now')",
  ]);
  if (!update) return getForeshadowById(id);

  db.prepare(update.sql).run(...update.values, id);
  return getForeshadowById(id);
}

// ============ 删除 ============

export async function deleteForeshadow(id: string): Promise<boolean> {
  const db = await getDb();
  const result = db
    .prepare("DELETE FROM foreshadows WHERE id = ?")
    .run(id);
  return result.changes > 0;
}
