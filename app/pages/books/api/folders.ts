import { client } from "@/app/api-client";
import type { Folder } from "@/app/types";

export async function getFoldersByBookAndCategory(
  bookId: string,
  category: string
): Promise<Folder[]> {
  return client.get<Folder[]>("/api/folders", { bookId, category });
}

export async function createFolder(
  bookId: string,
  category: string,
  name: string
): Promise<Folder> {
  return client.post<Folder, { bookId: string; category: string; name: string }>(
    "/api/folders",
    {
      bookId,
      category,
      name
    }
  );
}

export async function deleteFolder(folderId: string): Promise<void> {
  await client.delete(`/api/folders/${folderId}`);
}
