import { client } from "@/app/api-client";
import type {
  BookOutline,
  VolumeOutline,
  ChapterOutline,
  ArchivedChapter,
  KeyPoint
} from "@/app/types";

// ============ 总纲 ============

export async function fetchOutline(bookId: string): Promise<BookOutline | null> {
  const res = await client.get<{ outline: BookOutline | null }>("/api/outline", { bookId });
  return res.outline ?? null;
}

export async function updateOutline(
  bookId: string,
  data: { direction: string; stages: string; sellingPoints: string }
): Promise<BookOutline> {
  const res = await client.put<{ outline: BookOutline }>("/api/outline", { bookId, ...data });
  return res.outline;
}

// ============ 卷纲 ============

export async function fetchVolumes(bookId: string): Promise<VolumeOutline[]> {
  const res = await client.get<{ volumes: VolumeOutline[] }>("/api/volumes", { bookId });
  return res.volumes ?? [];
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
  }
): Promise<VolumeOutline> {
  const res = await client.post<{ volume: VolumeOutline }>("/api/volumes", { bookId, ...data });
  return res.volume;
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
  }>
): Promise<VolumeOutline> {
  const res = await client.put<{ volume: VolumeOutline }, typeof data>(`/api/volumes/${id}`, data);
  return res.volume;
}

export async function deleteVolume(id: string): Promise<void> {
  await client.delete(`/api/volumes/${id}`);
}

// ============ 章纲 ============

export async function fetchChapters(volumeId: string): Promise<ChapterOutline[]> {
  const res = await client.get<{ chapters: ChapterOutline[] }>("/api/chapters", { volumeId });
  return res.chapters ?? [];
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
  }
): Promise<ChapterOutline> {
  const res = await client.post<{ chapter: ChapterOutline }>("/api/chapters", { volumeId, ...data });
  return res.chapter;
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
    status: string;
  }>
): Promise<ChapterOutline> {
  const res = await client.put<{ chapter: ChapterOutline }, typeof data>(`/api/chapters/${id}`, data);
  return res.chapter;
}

export async function deleteChapter(id: string): Promise<void> {
  await client.delete(`/api/chapters/${id}`);
}

// ============ 正文库 ============

export async function fetchArchives(bookId: string): Promise<ArchivedChapter[]> {
  const res = await client.get<{ archives: ArchivedChapter[] }>("/api/archive", { bookId });
  return res.archives ?? [];
}

export async function getArchive(id: string): Promise<ArchivedChapter | null> {
  const res = await client.get<{ archive: ArchivedChapter | null }>(`/api/archive/${id}`);
  return res.archive ?? null;
}

export async function saveArchive(
  bookId: string,
  data: { chapterId: string; sortOrder: number; title: string; content: string }
): Promise<ArchivedChapter> {
  const res = await client.post<{ archive: ArchivedChapter }>("/api/archive/save", {
    bookId,
    ...data
  });
  return res.archive;
}

export async function deleteArchive(id: string): Promise<void> {
  await client.delete(`/api/archive/${id}`);
}
