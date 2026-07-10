// Foreshadow domain types

export type ForeshadowStatus = "hidden" | "revealed";

export interface Foreshadow {
  id: string;
  bookId: string;
  name: string;
  description: string;
  status: ForeshadowStatus;
  chapterId?: string;
  chapterNumber?: number;
  volumeId?: string;
  createdAt: string;
  updatedAt: string;
}
