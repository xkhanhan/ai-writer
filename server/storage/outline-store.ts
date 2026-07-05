import { randomUUID } from "node:crypto";
import { getDb } from "@/server/storage/db";
import type {
  BookOutline,
  VolumeOutline,
  ChapterOutline,
  ArchivedChapter,
  KeyPoint
} from "@/app/types";

// ============ Row 类型 ============

type BookOutlineRow = {
  book_id: string;
  direction: string;
  stages: string;
  selling_points: string;
  updated_at: string;
};

type VolumeRow = {
  id: string;
  book_id: string;
  title: string;
  core_conflict: string;
  stages: string;
  development_arc: string;
  key_points: string;
  highlights: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type ChapterRow = {
  id: string;
  volume_id: string;
  title: string;
  summary: string;
  prev_chapter_link: string;
  next_chapter_suspense: string;
  scenes: string;
  time: string;
  mood_tone: string;
  characters: string;
  key_events: string;
  foreshadowings: string;
  highlights: string;
  expected_words: number;
  note: string;
  content: string;
  sort_order: number;
  status: string;
  created_at: string;
  updated_at: string;
};

type ArchivedChapterRow = {
  id: string;
  book_id: string;
  chapter_id: string;
  sort_order: number;
  title: string;
  content: string;
  word_count: number;
  archived_at: string;
};

// ============ 映射函数 ============

function mapOutline(row: BookOutlineRow): BookOutline {
  return {
    bookId: row.book_id,
    direction: row.direction,
    stages: row.stages,
    sellingPoints: row.selling_points,
    updatedAt: row.updated_at
  };
}

function mapVolume(row: VolumeRow): VolumeOutline {
  let keyPoints: KeyPoint[] = [];
  try {
    keyPoints = JSON.parse(row.key_points || "[]") as KeyPoint[];
  } catch {
    keyPoints = [];
  }
  let stages: string[] = [];
  try {
    stages = JSON.parse(row.stages || "[]");
    if (!Array.isArray(stages)) stages = [];
  } catch {
    stages = [];
  }
  return {
    id: row.id,
    bookId: row.book_id,
    title: row.title,
    coreConflict: row.core_conflict,
    stages,
    developmentArc: row.development_arc,
    keyPoints,
    highlights: row.highlights,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapChapter(row: ChapterRow): ChapterOutline {
  const parseArr = (s: string): string[] => {
    try {
      const v = JSON.parse(s || "[]");
      return Array.isArray(v) ? v.map(String) : [];
    } catch {
      return [];
    }
  };
  return {
    id: row.id,
    volumeId: row.volume_id,
    title: row.title,
    summary: row.summary,
    prevChapterLink: row.prev_chapter_link,
    nextChapterSuspense: row.next_chapter_suspense,
    scenes: parseArr(row.scenes),
    time: row.time,
    moodTone: row.mood_tone,
    characters: parseArr(row.characters),
    keyEvents: parseArr(row.key_events),
    foreshadowings: parseArr(row.foreshadowings),
    highlights: row.highlights,
    expectedWords: row.expected_words,
    note: row.note,
    content: row.content,
    sortOrder: row.sort_order,
    status: (row.status as ChapterOutline["status"]) ?? "planned",
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapArchive(row: ArchivedChapterRow): ArchivedChapter {
  return {
    id: row.id,
    bookId: row.book_id,
    chapterId: row.chapter_id,
    sortOrder: row.sort_order,
    title: row.title,
    content: row.content,
    wordCount: row.word_count,
    archivedAt: row.archived_at
  };
}

// ============ 总纲 ============

export async function getBookOutline(bookId: string): Promise<BookOutline | null> {
  const db = await getDb();
  const row = db
    .prepare("SELECT * FROM book_outlines WHERE book_id = ?")
    .get(bookId) as BookOutlineRow | undefined;
  return row ? mapOutline(row) : null;
}

export async function upsertBookOutline(
  bookId: string,
  data: { direction: string; stages: string; sellingPoints: string }
): Promise<BookOutline> {
  const db = await getDb();
  const exists = await getBookOutline(bookId);
  if (exists) {
    db.prepare(
      `UPDATE book_outlines SET direction = ?, stages = ?, selling_points = ?, updated_at = datetime('now') WHERE book_id = ?`
    ).run(data.direction, data.stages, data.sellingPoints, bookId);
  } else {
    db.prepare(
      `INSERT INTO book_outlines (book_id, direction, stages, selling_points) VALUES (?, ?, ?, ?)`
    ).run(bookId, data.direction, data.stages, data.sellingPoints);
  }
  return (await getBookOutline(bookId))!;
}

// ============ 卷纲 ============

export async function getVolumesByBookId(bookId: string): Promise<VolumeOutline[]> {
  const db = await getDb();
  const rows = db
    .prepare("SELECT * FROM volumes WHERE book_id = ? ORDER BY sort_order ASC, created_at ASC")
    .all(bookId) as VolumeRow[];
  return rows.map(mapVolume);
}

export async function getVolumeById(id: string): Promise<VolumeOutline | null> {
  const db = await getDb();
  const row = db.prepare("SELECT * FROM volumes WHERE id = ?").get(id) as VolumeRow | undefined;
  return row ? mapVolume(row) : null;
}

export async function createVolume(
  bookId: string,
  data: {
    title: string;
    coreConflict?: string;
    stages?: string[];
    developmentArc?: string;
    keyPoints?: KeyPoint[];
    highlights?: string;
    sortOrder?: number;
  }
): Promise<VolumeOutline> {
  const db = await getDb();
  const id = randomUUID();
  const sortOrder = data.sortOrder ?? 0;
  db.prepare(
    `INSERT INTO volumes (id, book_id, title, core_conflict, stages, development_arc, key_points, highlights, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    bookId,
    data.title,
    data.coreConflict ?? "",
    JSON.stringify(data.stages ?? []),
    data.developmentArc ?? "",
    JSON.stringify(data.keyPoints ?? []),
    data.highlights ?? "",
    sortOrder
  );
  return (await getVolumeById(id))!;
}

export async function updateVolume(
  id: string,
  data: Partial<{
    title: string;
    coreConflict: string;
    stages: string[];
    developmentArc: string;
    keyPoints: KeyPoint[];
    highlights: string;
    sortOrder: number;
  }>
): Promise<VolumeOutline | null> {
  const db = await getDb();
  const fields: string[] = [];
  const values: Array<string | number> = [];
  if (data.title !== undefined) { fields.push("title = ?"); values.push(data.title); }
  if (data.coreConflict !== undefined) { fields.push("core_conflict = ?"); values.push(data.coreConflict); }
  if (data.stages !== undefined) { fields.push("stages = ?"); values.push(JSON.stringify(data.stages)); }
  if (data.developmentArc !== undefined) { fields.push("development_arc = ?"); values.push(data.developmentArc); }
  if (data.keyPoints !== undefined) { fields.push("key_points = ?"); values.push(JSON.stringify(data.keyPoints)); }
  if (data.highlights !== undefined) { fields.push("highlights = ?"); values.push(data.highlights); }
  if (data.sortOrder !== undefined) { fields.push("sort_order = ?"); values.push(data.sortOrder); }
  if (fields.length === 0) return getVolumeById(id);
  fields.push("updated_at = datetime('now')");
  values.push(id);
  db.prepare(`UPDATE volumes SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  return getVolumeById(id);
}

export async function deleteVolume(id: string): Promise<boolean> {
  const db = await getDb();
  const result = db.prepare("DELETE FROM volumes WHERE id = ?").run(id);
  return result.changes > 0;
}

// ============ 章纲 ============

export async function getChaptersByVolumeId(volumeId: string): Promise<ChapterOutline[]> {
  const db = await getDb();
  const rows = db
    .prepare("SELECT * FROM chapters WHERE volume_id = ? ORDER BY sort_order ASC, created_at ASC")
    .all(volumeId) as ChapterRow[];
  return rows.map(mapChapter);
}

export async function getChapterById(id: string): Promise<ChapterOutline | null> {
  const db = await getDb();
  const row = db.prepare("SELECT * FROM chapters WHERE id = ?").get(id) as ChapterRow | undefined;
  return row ? mapChapter(row) : null;
}

export async function createChapter(
  volumeId: string,
  data: {
    title: string;
    summary?: string;
    prevChapterLink?: string;
    nextChapterSuspense?: string;
    scenes?: string[];
    time?: string;
    moodTone?: string;
    characters?: string[];
    keyEvents?: string[];
    foreshadowings?: string[];
    highlights?: string;
    expectedWords?: number;
    note?: string;
    sortOrder?: number;
  }
): Promise<ChapterOutline> {
  const db = await getDb();
  const id = randomUUID();
  db.prepare(
    `INSERT INTO chapters (id, volume_id, title, summary, prev_chapter_link, next_chapter_suspense, scenes, time, mood_tone, characters, key_events, foreshadowings, highlights, expected_words, note, sort_order, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'planned')`
  ).run(
    id,
    volumeId,
    data.title,
    data.summary ?? "",
    data.prevChapterLink ?? "",
    data.nextChapterSuspense ?? "",
    JSON.stringify(data.scenes ?? []),
    data.time ?? "",
    data.moodTone ?? "",
    JSON.stringify(data.characters ?? []),
    JSON.stringify(data.keyEvents ?? []),
    JSON.stringify(data.foreshadowings ?? []),
    data.highlights ?? "",
    data.expectedWords ?? 3000,
    data.note ?? "",
    data.sortOrder ?? 0
  );
  return (await getChapterById(id))!;
}

export async function updateChapter(
  id: string,
  data: Partial<{
    title: string;
    summary: string;
    prevChapterLink: string;
    nextChapterSuspense: string;
    scenes: string[];
    time: string;
    moodTone: string;
    characters: string[];
    keyEvents: string[];
    foreshadowings: string[];
    highlights: string;
    expectedWords: number;
    note: string;
    content: string;
    sortOrder: number;
    status: string;
  }>
): Promise<ChapterOutline | null> {
  const db = await getDb();
  const fields: string[] = [];
  const values: Array<string | number> = [];
  const map: Record<string, [string, boolean]> = {
    title: ["title", false],
    summary: ["summary", false],
    prevChapterLink: ["prev_chapter_link", false],
    nextChapterSuspense: ["next_chapter_suspense", false],
    scenes: ["scenes", true],
    time: ["time", false],
    moodTone: ["mood_tone", false],
    characters: ["characters", true],
    keyEvents: ["key_events", true],
    foreshadowings: ["foreshadowings", true],
    highlights: ["highlights", false],
    expectedWords: ["expected_words", false],
    note: ["note", false],
    content: ["content", false],
    sortOrder: ["sort_order", false],
    status: ["status", false]
  };
  for (const [key, [col, isArray]] of Object.entries(map)) {
    const val = data[key as keyof typeof data];
    if (val !== undefined) {
      fields.push(`${col} = ?`);
      values.push(isArray ? JSON.stringify(val) : (val as string | number));
    }
  }
  if (fields.length === 0) return getChapterById(id);
  fields.push("updated_at = datetime('now')");
  values.push(id);
  db.prepare(`UPDATE chapters SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  return getChapterById(id);
}

export async function deleteChapter(id: string): Promise<boolean> {
  const db = await getDb();
  const result = db.prepare("DELETE FROM chapters WHERE id = ?").run(id);
  return result.changes > 0;
}

// ============ 正文库存稿 ============

export async function getArchivedChaptersByBookId(bookId: string): Promise<ArchivedChapter[]> {
  const db = await getDb();
  const rows = db
    .prepare("SELECT * FROM archived_chapters WHERE book_id = ? ORDER BY sort_order ASC, archived_at DESC")
    .all(bookId) as ArchivedChapterRow[];
  return rows.map(mapArchive);
}

export async function getArchivedChapterById(id: string): Promise<ArchivedChapter | null> {
  const db = await getDb();
  const row = db.prepare("SELECT * FROM archived_chapters WHERE id = ?").get(id) as ArchivedChapterRow | undefined;
  return row ? mapArchive(row) : null;
}

export async function saveArchivedChapter(
  bookId: string,
  data: { chapterId: string; sortOrder: number; title: string; content: string }
): Promise<ArchivedChapter> {
  const db = await getDb();
  const existing = db
    .prepare("SELECT id FROM archived_chapters WHERE book_id = ? AND chapter_id = ?")
    .get(bookId, data.chapterId) as { id: string } | undefined;

  const wordCount = data.content.replace(/\s/g, "").length;

  if (existing) {
    db.prepare(
      `UPDATE archived_chapters SET title = ?, content = ?, word_count = ?, sort_order = ?, archived_at = datetime('now') WHERE id = ?`
    ).run(data.title, data.content, wordCount, data.sortOrder, existing.id);
    return (await getArchivedChapterById(existing.id))!;
  }

  const id = randomUUID();
  db.prepare(
    `INSERT INTO archived_chapters (id, book_id, chapter_id, sort_order, title, content, word_count)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, bookId, data.chapterId, data.sortOrder, data.title, data.content, wordCount);
  return (await getArchivedChapterById(id))!;
}

export async function deleteArchivedChapter(id: string): Promise<boolean> {
  const db = await getDb();
  const result = db.prepare("DELETE FROM archived_chapters WHERE id = ?").run(id);
  return result.changes > 0;
}
