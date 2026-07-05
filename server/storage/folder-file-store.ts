import { randomUUID } from "node:crypto";
import type { BookFile, Folder } from "@/app/types";
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
  const folders = db.prepare(`
    SELECT * FROM folders WHERE book_id = ? AND category = ? ORDER BY created_at ASC
  `).all(bookId, category) as FolderRow[];

  const result: Folder[] = [];

  for (const folder of folders) {
    const files = db.prepare(`
      SELECT * FROM files WHERE folder_id = ? ORDER BY created_at ASC
    `).all(folder.id) as FileRow[];

    result.push({
      id: folder.id,
      name: folder.name,
      bookId: folder.book_id,
      category: folder.category,
      files: files.map(mapFileRow),
      createdAt: folder.created_at,
      updatedAt: folder.updated_at
    });
  }

  return result;
}

export async function createFolder(
  bookId: string,
  category: string,
  name: string
): Promise<Folder> {
  const db = await getDb();
  const id = randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO folders (id, name, book_id, category, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, name, bookId, category, now, now);

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
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO files (id, name, content, folder_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, name, "", folderId, now, now);

  db.prepare(`
    UPDATE folders SET updated_at = ? WHERE id = ?
  `).run(now, folderId);

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
  const now = new Date().toISOString();

  const result = db.prepare(`
    UPDATE files SET content = ?, updated_at = ? WHERE id = ?
  `).run(content, now, fileId);

  if (result.changes > 0) {
    const file = db.prepare(`
      SELECT folder_id FROM files WHERE id = ?
    `).get(fileId) as Pick<FileRow, "folder_id"> | undefined;

    if (file) {
      db.prepare(`
        UPDATE folders SET updated_at = ? WHERE id = ?
      `).run(now, file.folder_id);
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
