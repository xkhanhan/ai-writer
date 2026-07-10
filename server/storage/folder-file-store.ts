import { randomUUID } from "node:crypto";
import type { BookFile, Folder } from "@/shared/types";
import { getDb } from "@/server/storage/db";

type FolderRow = {
  id: string;
  name: string;
  book_id: string;
  category: string;
  created_at: string;
  updated_at: string;
};

type FileRow = {
  id: string;
  name: string;
  content: string;
  folder_id: string;
  created_at: string;
  updated_at: string;
};

function mapFileRow(row: FileRow): BookFile {
  return {
    id: row.id,
    name: row.name,
    content: row.content,
    folderId: row.folder_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function getFoldersByBookAndCategory(
  bookId: string,
  category: string
): Promise<Folder[]> {
  const db = await getDb();
  const rows = db.prepare(`
    SELECT f.id as folder_id, f.name as folder_name, f.book_id, f.category,
           f.created_at as folder_created_at, f.updated_at as folder_updated_at,
           fi.id, fi.name as file_name, fi.content,
           fi.created_at as file_created_at, fi.updated_at as file_updated_at
    FROM folders f
    LEFT JOIN files fi ON fi.folder_id = f.id
    WHERE f.book_id = ? AND f.category = ?
    ORDER BY f.created_at ASC, fi.created_at ASC
  `).all(bookId, category) as Array<{
    folder_id: string;
    folder_name: string;
    book_id: string;
    category: string;
    folder_created_at: string;
    folder_updated_at: string;
    id: string | null;
    file_name: string | null;
    content: string | null;
    file_created_at: string | null;
    file_updated_at: string | null;
  }>;

  const folderMap = new Map<string, Folder>();

  for (const row of rows) {
    let folder = folderMap.get(row.folder_id);
    if (!folder) {
      folder = {
        id: row.folder_id,
        name: row.folder_name,
        bookId: row.book_id,
        category: row.category,
        files: [],
        createdAt: row.folder_created_at,
        updatedAt: row.folder_updated_at
      };
      folderMap.set(row.folder_id, folder);
    }

    if (row.id) {
      folder.files.push({
        id: row.id,
        name: row.file_name!,
        content: row.content!,
        folderId: row.folder_id!,
        createdAt: row.file_created_at!,
        updatedAt: row.file_updated_at!
      });
    }
  }

  return Array.from(folderMap.values());
}

export async function createFolder(
  bookId: string,
  category: string,
  name: string
): Promise<Folder> {
  const db = await getDb();
  const id = randomUUID();

  db.prepare(`
    INSERT INTO folders (id, name, book_id, category)
    VALUES (?, ?, ?, ?)
  `).run(id, name, bookId, category);

  const now = new Date().toISOString();
  return {
    id,
    name,
    bookId,
    category,
    files: [],
    createdAt: now,
    updatedAt: now
  };
}

export async function deleteFolder(folderId: string): Promise<boolean> {
  const db = await getDb();
  const result = db.prepare(`
    DELETE FROM folders WHERE id = ?
  `).run(folderId);

  return result.changes > 0;
}

export async function createFile(
  folderId: string,
  name: string
): Promise<BookFile | null> {
  const db = await getDb();
  const folder = db.prepare(`
    SELECT id FROM folders WHERE id = ?
  `).get(folderId) as Pick<FolderRow, "id"> | undefined;

  if (!folder) {
    return null;
  }

  const id = randomUUID();

  db.transaction(() => {
    db.prepare(`
      INSERT INTO files (id, name, content, folder_id)
      VALUES (?, ?, ?, ?)
    `).run(id, name, "", folderId);

    db.prepare(`
      UPDATE folders SET updated_at = datetime('now') WHERE id = ?
    `).run(folderId);
  })();

  const now = new Date().toISOString();
  return {
    id,
    name,
    content: "",
    folderId,
    createdAt: now,
    updatedAt: now
  };
}

export async function updateFileContent(
  fileId: string,
  content: string
): Promise<boolean> {
  const db = await getDb();

  const result = db.prepare(`
    UPDATE files SET content = ?, updated_at = datetime('now') WHERE id = ?
  `).run(content, fileId);

  if (result.changes > 0) {
    const file = db.prepare(`
      SELECT folder_id FROM files WHERE id = ?
    `).get(fileId) as Pick<FileRow, "folder_id"> | undefined;

    if (file) {
      db.prepare(`
        UPDATE folders SET updated_at = datetime('now') WHERE id = ?
      `).run(file.folder_id);
    }
  }

  return result.changes > 0;
}

export async function deleteFile(fileId: string): Promise<boolean> {
  const db = await getDb();
  const result = db.prepare(`
    DELETE FROM files WHERE id = ?
  `).run(fileId);

  return result.changes > 0;
}

export async function getFileById(fileId: string): Promise<BookFile | null> {
  const db = await getDb();
  const file = db.prepare(`
    SELECT * FROM files WHERE id = ?
  `).get(fileId) as FileRow | undefined;

  return file ? mapFileRow(file) : null;
}
