import { randomUUID } from "node:crypto";
import { getDb } from "@/server/storage/db";
import { parseJsonSafe } from "@/server/utils/json";
import { buildUpdateSet } from "@/server/utils/store-helpers";
import type {
  StoryFact,
  CreateStoryFactDTO,
  UpdateStoryFactDTO,
} from "@/shared/types";

// ============ Row 类型 ============

type StoryFactRow = {
  id: string;
  book_id: string;
  chapter_id: string;
  chapter_number: number;
  content: string;
  related_character_ids: string;
  created_at: string;
  updated_at: string;
};

// ============ 映射函数 ============

function mapStoryFact(row: StoryFactRow): StoryFact {
  return {
    id: row.id,
    bookId: row.book_id,
    chapterId: row.chapter_id,
    chapterNumber: row.chapter_number,
    content: row.content,
    relatedCharacterIds: parseJsonSafe<string[]>(
      row.related_character_ids,
      []
    ),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============ 查询 ============

export async function getStoryFactsByBookId(
  bookId: string
): Promise<StoryFact[]> {
  const db = await getDb();
  const rows = db
    .prepare(
      "SELECT * FROM story_facts WHERE book_id = ? ORDER BY chapter_number ASC, created_at ASC"
    )
    .all(bookId) as StoryFactRow[];
  return rows.map(mapStoryFact);
}

export async function getStoryFactsByChapterNumber(
  bookId: string,
  chapterNumber: number
): Promise<StoryFact[]> {
  const db = await getDb();
  const rows = db
    .prepare(
      "SELECT * FROM story_facts WHERE book_id = ? AND chapter_number <= ? ORDER BY chapter_number ASC, created_at ASC"
    )
    .all(bookId, chapterNumber) as StoryFactRow[];
  return rows.map(mapStoryFact);
}

export async function getStoryFactById(id: string): Promise<StoryFact | null> {
  const db = await getDb();
  const row = db
    .prepare("SELECT * FROM story_facts WHERE id = ?")
    .get(id) as StoryFactRow | undefined;
  return row ? mapStoryFact(row) : null;
}

// ============ 创建 ============

export async function createStoryFact(
  bookId: string,
  data: CreateStoryFactDTO
): Promise<StoryFact> {
  const db = await getDb();
  const id = randomUUID();

  db.prepare(
    `INSERT INTO story_facts (id, book_id, chapter_id, chapter_number, content, related_character_ids)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    bookId,
    data.chapterId ?? "",
    data.chapterNumber ?? 0,
    data.content ?? "",
    JSON.stringify(data.relatedCharacterIds ?? [])
  );

  return (await getStoryFactById(id))!;
}

// ============ 更新 ============

export async function updateStoryFact(
  id: string,
  data: UpdateStoryFactDTO
): Promise<StoryFact | null> {
  const db = await getDb();
  const fieldMap = {
    chapter_id: data.chapterId,
    chapter_number: data.chapterNumber,
    content: data.content,
    related_character_ids: data.relatedCharacterIds !== undefined
      ? JSON.stringify(data.relatedCharacterIds)
      : undefined,
  };

  const update = buildUpdateSet("story_facts", fieldMap, ["updated_at = datetime('now')"]);
  if (!update) return getStoryFactById(id);

  db.prepare(update.sql).run(...update.values, id);
  return getStoryFactById(id);
}

// ============ 删除 ============

export async function deleteStoryFact(id: string): Promise<boolean> {
  const db = await getDb();
  const result = db
    .prepare("DELETE FROM story_facts WHERE id = ?")
    .run(id);
  return result.changes > 0;
}
