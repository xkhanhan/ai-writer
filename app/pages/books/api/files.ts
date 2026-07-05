import { client } from "@/app/api-client";
import type { BookFile } from "@/app/types";

export async function createFile(folderId: string, name: string): Promise<BookFile> {
  return client.post<BookFile, { folderId: string; name: string }>("/api/files", {
    folderId,
    name
  });
}

export async function getFileById(fileId: string): Promise<BookFile> {
  return client.get<BookFile>(`/api/files/${fileId}`);
}

export async function updateFileContent(fileId: string, content: string): Promise<void> {
  await client.patch<void, { content: string }>(`/api/files/${fileId}`, { content });
}

export async function deleteFile(fileId: string): Promise<void> {
  await client.delete(`/api/files/${fileId}`);
}
