// Story fact domain types

export interface StoryFact {
  id: string;
  bookId: string;
  chapterId: string;
  chapterNumber: number;
  content: string;
  relatedCharacterIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateStoryFactDTO {
  chapterId: string;
  chapterNumber: number;
  content: string;
  relatedCharacterIds?: string[];
}

export interface UpdateStoryFactDTO {
  chapterId?: string;
  chapterNumber?: number;
  content?: string;
  relatedCharacterIds?: string[];
}
