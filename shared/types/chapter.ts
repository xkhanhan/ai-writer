// Chapter / Volume domain types

export interface KeyPoint {
  chapter: string;
  description: string;
}

export interface BookOutline {
  bookId: string;
  direction: string;
  stages: string;
  sellingPoints: string;
  updatedAt: string;
}

export interface VolumeOutline {
  id: string;
  bookId: string;
  title: string;
  coreConflict: string;
  stages: string[];
  developmentArc: string;
  keyPoints: KeyPoint[];
  highlights: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChapterOutline {
  id: string;
  volumeId: string;
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
  status: "planned" | "writing" | "done";
  createdAt: string;
  updatedAt: string;
}

export interface CreateVolumeDTO {
  bookId: string;
  title: string;
  coreConflict?: string;
  stages?: string[];
  developmentArc?: string;
  keyPoints?: KeyPoint[];
  highlights?: string;
}

export interface UpdateVolumeDTO {
  title?: string;
  coreConflict?: string;
  stages?: string[];
  developmentArc?: string;
  keyPoints?: KeyPoint[];
  highlights?: string;
}

export interface CreateChapterDTO {
  volumeId: string;
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

export interface UpdateChapterDTO {
  title?: string;
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
  content?: string;
  status?: "planned" | "writing" | "done";
}

export interface ArchivedChapter {
  id: string;
  bookId: string;
  chapterId: string;
  sortOrder: number;
  title: string;
  content: string;
  wordCount: number;
  archivedAt: string;
}

export type ChapterStatus = "draft" | "generated" | "approved";
