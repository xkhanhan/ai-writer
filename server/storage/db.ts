import Database from "better-sqlite3";
import path from "path";
import { promises as fs } from "fs";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "novel-writer.db");

let db: Database.Database | null = null;

export async function getDb(): Promise<Database.Database> {
  if (db) return db;

  // 确保数据目录存在
  await fs.mkdir(DATA_DIR, { recursive: true });

  // 创建数据库连接
  db = new Database(DB_PATH);

  // 启用 WAL 模式提高性能
  db.pragma("journal_mode = WAL");

  // 初始化表结构
  initializeTables(db);

  // 迁移：为 books 表补充元信息列
  migrateBookMetadata(db);

  // 迁移：为 volumes 表补充 stages 列
  migrateVolumeStages(db);

  // 迁移：为 chapters 表补充新字段
  migrateChapterNewFields(db);

  return db;
}

// 迁移：为 books 表补充元信息列
function migrateBookMetadata(db: Database.Database) {
  const columns = db.prepare(`
    PRAGMA table_info(books)
  `).all() as Array<{ name: string }>;

  const existing = new Set(columns.map((c) => c.name));

  const newColumns: Array<{ name: string; def: string }> = [
    { name: "sub_genre", def: "TEXT NOT NULL DEFAULT ''" },
    { name: "tags", def: "TEXT NOT NULL DEFAULT ''" },
    { name: "writing_style", def: "TEXT NOT NULL DEFAULT ''" },
    { name: "narrative_pov", def: "TEXT NOT NULL DEFAULT ''" },
    { name: "target_audience", def: "TEXT NOT NULL DEFAULT ''" },
    { name: "target_word_count", def: "INTEGER DEFAULT 0" },
    { name: "ending_type", def: "TEXT NOT NULL DEFAULT ''" },
    { name: "reference_works", def: "TEXT NOT NULL DEFAULT ''" },
    { name: "selling_point", def: "TEXT NOT NULL DEFAULT ''" }
  ];

  for (const col of newColumns) {
    if (!existing.has(col.name)) {
      db.exec(`ALTER TABLE books ADD COLUMN ${col.name} ${col.def}`);
    }
  }
}

function migrateVolumeStages(db: Database.Database) {
  const columns = db.prepare("PRAGMA table_info(volumes)").all() as Array<{ name: string }>;
  const existing = new Set(columns.map((c) => c.name));
  if (!existing.has("stages")) {
    db.exec("ALTER TABLE volumes ADD COLUMN stages TEXT DEFAULT '[]'");
  }
}

function migrateChapterNewFields(db: Database.Database) {
  const columns = db.prepare("PRAGMA table_info(chapters)").all() as Array<{ name: string }>;
  const existing = new Set(columns.map((c) => c.name));
  const newColumns: Array<{ name: string; def: string }> = [
    { name: "prev_chapter_link", def: "TEXT DEFAULT ''" },
    { name: "next_chapter_suspense", def: "TEXT DEFAULT ''" },
    { name: "time", def: "TEXT DEFAULT ''" },
    { name: "mood_tone", def: "TEXT DEFAULT ''" },
  ];
  for (const col of newColumns) {
    if (!existing.has(col.name)) {
      db.exec(`ALTER TABLE chapters ADD COLUMN ${col.name} ${col.def}`);
    }
  }
}

function initializeTables(db: Database.Database) {
  // 创建书籍表
  db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      genre TEXT NOT NULL,
      platform TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // 创建书籍选项表
  db.exec(`
    CREATE TABLE IF NOT EXISTS book_options (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // 创建文件夹表
  db.exec(`
    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      book_id TEXT NOT NULL,
      category TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // 创建文件表
  db.exec(`
    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      content TEXT DEFAULT '',
      folder_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE
    )
  `);

  // 创建索引
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_books_updated_at ON books(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_folders_book_category ON folders(book_id, category);
    CREATE INDEX IF NOT EXISTS idx_files_folder_id ON files(folder_id);
  `);

  // 创作区 - 卷纲
  db.exec(`
    CREATE TABLE IF NOT EXISTS volumes (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL,
      title TEXT NOT NULL,
      core_conflict TEXT DEFAULT '',
      development_arc TEXT DEFAULT '',
      key_points TEXT DEFAULT '[]',
      highlights TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_volumes_book_id ON volumes(book_id);
  `);

  // 创作区 - 章纲
  db.exec(`
    CREATE TABLE IF NOT EXISTS chapters (
      id TEXT PRIMARY KEY,
      volume_id TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT DEFAULT '',
      scenes TEXT DEFAULT '[]',
      characters TEXT DEFAULT '[]',
      key_events TEXT DEFAULT '[]',
      foreshadowings TEXT DEFAULT '[]',
      highlights TEXT DEFAULT '',
      expected_words INTEGER DEFAULT 3000,
      note TEXT DEFAULT '',
      content TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      status TEXT DEFAULT 'planned',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (volume_id) REFERENCES volumes(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_chapters_volume_id ON chapters(volume_id);
  `);

  // 创作区 - 总纲（每本书一条）
  db.exec(`
    CREATE TABLE IF NOT EXISTS book_outlines (
      book_id TEXT PRIMARY KEY,
      direction TEXT DEFAULT '',
      stages TEXT DEFAULT '',
      selling_points TEXT DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    );
  `);

  // 正文库 - 存稿
  db.exec(`
    CREATE TABLE IF NOT EXISTS archived_chapters (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL,
      chapter_id TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      title TEXT NOT NULL,
      content TEXT DEFAULT '',
      word_count INTEGER DEFAULT 0,
      archived_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_archive_book_id ON archived_chapters(book_id);
  `);
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}
