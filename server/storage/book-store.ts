import { randomUUID } from "node:crypto";
import { getDb } from "@/server/storage/db";
import { getBookOptions } from "@/server/storage/book-options-store";

export type Book = {
  id: string;
  title: string;
  description: string;
  genre: string;
  platform: string;
  subGenre: string;
  tags: string;
  writingStyle: string;
  narrativePov: string;
  targetAudience: string;
  targetWordCount: number;
  targetTotalWords: number;
  endingType: string;
  referenceWorks: string;
  sellingPoint: string;
  createdAt: string;
  updatedAt: string;
};

type BookRow = {
  id: string;
  title: string;
  description: string;
  genre: string;
  platform: string;
  sub_genre: string;
  tags: string;
  writing_style: string;
  narrative_pov: string;
  target_audience: string;
  target_word_count: number;
  target_total_words: number;
  ending_type: string;
  reference_works: string;
  selling_point: string;
  created_at: string;
  updated_at: string;
};

function mapBookRow(row: BookRow): Book {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    genre: row.genre,
    platform: row.platform,
    subGenre: row.sub_genre ?? "",
    tags: row.tags ?? "",
    writingStyle: row.writing_style ?? "",
    narrativePov: row.narrative_pov ?? "",
    targetAudience: row.target_audience ?? "",
    targetWordCount: row.target_word_count ?? 0,
    targetTotalWords: row.target_total_words ?? 0,
    endingType: row.ending_type ?? "",
    referenceWorks: row.reference_works ?? "",
    sellingPoint: row.selling_point ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function listBooks(): Promise<Book[]> {
  const db = await getDb();
  const rows = db.prepare(`
    SELECT * FROM books ORDER BY updated_at DESC
  `).all() as BookRow[];

  return rows.map(mapBookRow);
}

export async function getBookById(id: string): Promise<Book | null> {
  const db = await getDb();
  const row = db.prepare(`
    SELECT * FROM books WHERE id = ?
  `).get(id) as BookRow | undefined;

  return row ? mapBookRow(row) : null;
}

export async function createBook(input: {
  title: string;
  description: string;
  genre: string;
  platform: string;
}): Promise<Book> {
  const title = input.title.trim() || "未命名";
  const description = input.description.trim();
  const genre = input.genre.trim();
  const platform = input.platform.trim();

  if (title.length > 60) {
    throw new Error("书名长度不能超过 60 个字符。");
  }

  if (description.length > 300) {
    throw new Error("简介长度不能超过 300 个字符。");
  }

  if (!genre) {
    throw new Error("题材不能为空。");
  }

  if (!platform) {
    throw new Error("平台不能为空。");
  }

  const options = await getBookOptions();

  if (!options.genres.includes(genre)) {
    throw new Error("题材不在允许范围内。");
  }

  if (!options.platforms.includes(platform)) {
    throw new Error("平台不在允许范围内。");
  }

  const db = await getDb();
  const id = randomUUID();

  db.prepare(`
    INSERT INTO books (id, title, description, genre, platform)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, title, description, genre, platform);

  const now = new Date().toISOString();
  return {
    id,
    title,
    description,
    genre,
    platform,
    subGenre: "",
    tags: "",
    writingStyle: "",
    narrativePov: "",
    targetAudience: "",
    targetWordCount: 0,
    targetTotalWords: 0,
    endingType: "",
    referenceWorks: "",
    sellingPoint: "",
    createdAt: now,
    updatedAt: now
  };
}

export async function updateBook(
  id: string,
  input: {
    title?: string;
    description?: string;
    genre?: string;
    platform?: string;
    subGenre?: string;
    tags?: string;
    writingStyle?: string;
    narrativePov?: string;
    targetAudience?: string;
    targetWordCount?: number;
    targetTotalWords?: number;
    endingType?: string;
    referenceWorks?: string;
    sellingPoint?: string;
  }
): Promise<boolean> {
  const db = await getDb();
  const fields: string[] = [];
  const values: Array<string | number> = [];

  if (input.title !== undefined) {
    fields.push("title = ?");
    values.push(input.title.trim() || "未命名");
  }
  if (input.description !== undefined) {
    fields.push("description = ?");
    values.push(input.description.trim());
  }
  if (input.genre !== undefined) {
    fields.push("genre = ?");
    values.push(input.genre.trim());
  }
  if (input.platform !== undefined) {
    fields.push("platform = ?");
    values.push(input.platform.trim());
  }
  if (input.subGenre !== undefined) {
    fields.push("sub_genre = ?");
    values.push(input.subGenre.trim());
  }
  if (input.tags !== undefined) {
    fields.push("tags = ?");
    values.push(input.tags.trim());
  }
  if (input.writingStyle !== undefined) {
    fields.push("writing_style = ?");
    values.push(input.writingStyle.trim());
  }
  if (input.narrativePov !== undefined) {
    fields.push("narrative_pov = ?");
    values.push(input.narrativePov.trim());
  }
  if (input.targetAudience !== undefined) {
    fields.push("target_audience = ?");
    values.push(input.targetAudience.trim());
  }
  if (input.targetWordCount !== undefined) {
    const count = Number(input.targetWordCount);
    fields.push("target_word_count = ?");
    values.push(Number.isFinite(count) && count >= 0 ? Math.floor(count) : 0);
  }
  if (input.targetTotalWords !== undefined) {
    const count = Number(input.targetTotalWords);
    fields.push("target_total_words = ?");
    values.push(Number.isFinite(count) && count >= 0 ? Math.floor(count) : 0);
  }
  if (input.endingType !== undefined) {
    fields.push("ending_type = ?");
    values.push(input.endingType.trim());
  }
  if (input.referenceWorks !== undefined) {
    fields.push("reference_works = ?");
    values.push(input.referenceWorks.trim());
  }
  if (input.sellingPoint !== undefined) {
    fields.push("selling_point = ?");
    values.push(input.sellingPoint.trim());
  }

  if (fields.length === 0) {
    return false;
  }

  fields.push("updated_at = datetime('now')");
  values.push(id);

  const result = db.prepare(`
    UPDATE books SET ${fields.join(", ")} WHERE id = ?
  `).run(...values);

  return result.changes > 0;
}

export async function deleteBook(id: string): Promise<boolean> {
  const db = await getDb();
  const result = db.prepare(`
    DELETE FROM books WHERE id = ?
  `).run(id);

  return result.changes > 0;
}
