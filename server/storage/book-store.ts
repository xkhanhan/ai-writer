import { randomUUID } from "node:crypto";
import { getDb } from "@/server/storage/db";
import { getBookOptions } from "@/server/storage/book-options-store";
import { buildUpdateSet } from "@/server/utils/store-helpers";

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

  return (await getBookById(id))!;
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
  // Validate provided fields using same rules as createBook
  if (input.title !== undefined) {
    const title = input.title.trim() || "未命名";
    if (title.length > 60) {
      throw new Error("书名长度不能超过 60 个字符。");
    }
  }
  if (input.description !== undefined) {
    const description = input.description.trim();
    if (description.length > 300) {
      throw new Error("简介长度不能超过 300 个字符。");
    }
  }

  if (input.genre !== undefined || input.platform !== undefined) {
    const options = await getBookOptions();
    if (input.genre !== undefined) {
      const genre = input.genre.trim();
      if (!genre) {
        throw new Error("题材不能为空。");
      }
      if (!options.genres.includes(genre)) {
        throw new Error("题材不在允许范围内。");
      }
    }
    if (input.platform !== undefined) {
      const platform = input.platform.trim();
      if (!platform) {
        throw new Error("平台不能为空。");
      }
      if (!options.platforms.includes(platform)) {
        throw new Error("平台不在允许范围内。");
      }
    }
  }

  const db = await getDb();

  const fieldMap = {
    title: input.title !== undefined ? (input.title.trim() || "未命名") : undefined,
    description: input.description !== undefined ? input.description.trim() : undefined,
    genre: input.genre !== undefined ? input.genre.trim() : undefined,
    platform: input.platform !== undefined ? input.platform.trim() : undefined,
    sub_genre: input.subGenre !== undefined ? input.subGenre.trim() : undefined,
    tags: input.tags !== undefined ? input.tags.trim() : undefined,
    writing_style: input.writingStyle !== undefined ? input.writingStyle.trim() : undefined,
    narrative_pov: input.narrativePov !== undefined ? input.narrativePov.trim() : undefined,
    target_audience: input.targetAudience !== undefined ? input.targetAudience.trim() : undefined,
    target_word_count: input.targetWordCount !== undefined
      ? (() => { const c = Number(input.targetWordCount); return Number.isFinite(c) && c >= 0 ? Math.floor(c) : 0; })()
      : undefined,
    target_total_words: input.targetTotalWords !== undefined
      ? (() => { const c = Number(input.targetTotalWords); return Number.isFinite(c) && c >= 0 ? Math.floor(c) : 0; })()
      : undefined,
    ending_type: input.endingType !== undefined ? input.endingType.trim() : undefined,
    reference_works: input.referenceWorks !== undefined ? input.referenceWorks.trim() : undefined,
    selling_point: input.sellingPoint !== undefined ? input.sellingPoint.trim() : undefined,
  };

  const update = buildUpdateSet("books", fieldMap, ["updated_at = datetime('now')"]);
  if (!update) return false;

  const result = db.prepare(update.sql).run(...update.values, id);
  return result.changes > 0;
}

export async function deleteBook(id: string): Promise<boolean> {
  const db = await getDb();
  const result = db.prepare(`
    DELETE FROM books WHERE id = ?
  `).run(id);

  return result.changes > 0;
}
