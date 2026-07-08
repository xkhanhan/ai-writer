import { client } from "@/app/api-client";
import type { Result } from "@/app/api-client";
import type {
  BookOutline,
  VolumeOutline,
  ChapterOutline,
  ArchivedChapter,
  CreateVolumeDTO,
  UpdateVolumeDTO,
  CreateChapterDTO,
  UpdateChapterDTO,
} from "@/app/types";

// ============ 总纲 ============

export async function fetchOutline(bookId: string): Promise<Result<BookOutline | null>> {
  const res = await client.get<{ outline: BookOutline | null }>("/api/outline", { bookId });
  if (!res.ok) return res;
  return { ok: true, data: res.data.outline ?? null };
}

export async function updateOutline(
  bookId: string,
  data: Partial<BookOutline>
): Promise<Result<BookOutline>> {
  const res = await client.patch<{ outline: BookOutline }, Partial<BookOutline>>("/api/outline", {
    bookId,
    ...data,
  });
  if (!res.ok) return res;
  return { ok: true, data: res.data.outline };
}

// ============ 卷纲 ============

export async function fetchVolumes(bookId: string): Promise<Result<VolumeOutline[]>> {
  const res = await client.get<{ volumes: VolumeOutline[] }>("/api/volumes", { bookId });
  if (!res.ok) return res;
  return { ok: true, data: res.data.volumes ?? [] };
}

export async function createVolume(
  data: CreateVolumeDTO
): Promise<Result<VolumeOutline>> {
  const res = await client.post<{ volume: VolumeOutline }>("/api/volumes", data);
  if (!res.ok) return res;
  return { ok: true, data: res.data.volume };
}

export async function updateVolume(
  id: string,
  data: UpdateVolumeDTO
): Promise<Result<VolumeOutline>> {
  const res = await client.patch<{ volume: VolumeOutline }, UpdateVolumeDTO>(
    `/api/volumes/${id}`,
    data
  );
  if (!res.ok) return res;
  return { ok: true, data: res.data.volume };
}

export async function deleteVolume(id: string): Promise<Result<void>> {
  return client.delete(`/api/volumes/${id}`);
}

// ============ 章纲 ============

export async function fetchChapters(volumeId: string): Promise<Result<ChapterOutline[]>> {
  const res = await client.get<{ chapters: ChapterOutline[] }>("/api/chapters", { volumeId });
  if (!res.ok) return res;
  return { ok: true, data: res.data.chapters ?? [] };
}

export async function createChapter(
  data: CreateChapterDTO
): Promise<Result<ChapterOutline>> {
  const res = await client.post<{ chapter: ChapterOutline }>("/api/chapters", data);
  if (!res.ok) return res;
  return { ok: true, data: res.data.chapter };
}

export async function updateChapter(
  id: string,
  data: UpdateChapterDTO
): Promise<Result<ChapterOutline>> {
  const res = await client.patch<{ chapter: ChapterOutline }, UpdateChapterDTO>(
    `/api/chapters/${id}`,
    data
  );
  if (!res.ok) return res;
  return { ok: true, data: res.data.chapter };
}

export async function deleteChapter(id: string): Promise<Result<void>> {
  return client.delete(`/api/chapters/${id}`);
}

// ============ 正文库 ============

export async function fetchArchives(bookId: string): Promise<Result<ArchivedChapter[]>> {
  const res = await client.get<{ archives: ArchivedChapter[] }>("/api/archive", { bookId });
  if (!res.ok) return res;
  return { ok: true, data: res.data.archives ?? [] };
}

export async function getArchive(id: string): Promise<Result<ArchivedChapter | null>> {
  const res = await client.get<{ archive: ArchivedChapter | null }>(`/api/archive/${id}`);
  if (!res.ok) return res;
  return { ok: true, data: res.data.archive ?? null };
}

export async function saveArchive(
  bookId: string,
  data: { chapterId: string; sortOrder: number; title: string; content: string }
): Promise<Result<ArchivedChapter>> {
  const res = await client.post<{ archive: ArchivedChapter }>("/api/archive/save", {
    bookId,
    ...data
  });
  if (!res.ok) return res;
  return { ok: true, data: res.data.archive };
}

export async function deleteArchive(id: string): Promise<Result<void>> {
  return client.delete(`/api/archive/${id}`);
}
