import { client } from "@/app/api-client";
import type { Result } from "@/app/api-client";
import type { BookFile } from "@/app/types";

export async function createFile(folderId: string, name: string): Promise<Result<BookFile>> {
  return client.post<BookFile, { folderId: string; name: string }>("/api/files", {
    folderId,
    name
  });
}

export async function getFileById(fileId: string): Promise<Result<BookFile>> {
  return client.get<BookFile>(`/api/files/${fileId}`);
}

export async function updateFileContent(fileId: string, content: string): Promise<Result<void>> {
  return client.patch<void, { content: string }>(`/api/files/${fileId}`, { content });
}

export async function deleteFile(fileId: string): Promise<Result<void>> {
  return client.delete(`/api/files/${fileId}`);
}
