// Book domain types

export interface GenreTreeNode {
  value: string;
  label: string;
  children?: GenreTreeNode[];
}

export interface Book {
  id: string;
  title: string;
  description: string;
  genre: string;
  platform: string;
  subGenre: string;
  tags: string;
  writingStyle: string;
  narrativePov: string;
  targetAudience: string;
  targetWordCount: number;
  targetTotalWords: number;
  endingType: string;
  referenceWorks: string;
  sellingPoint: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookOptions {
  genres: string[];
  platforms: string[];
  genreTree: GenreTreeNode[];
  writingStyles: string[];
  narrativePovs: string[];
  targetAudiences: string[];
  endingTypes: string[];
}

export interface CreateBookDTO {
  title: string;
  description?: string;
  genre: string;
  platform: string;
}

export interface UpdateBookDTO {
  title?: string;
  description?: string;
  genre?: string;
  platform?: string;
  subGenre?: string;
  tags?: string;
  writingStyle?: string;
  narrativePov?: string;
  targetAudience?: string;
  targetWordCount?: number;
  targetTotalWords?: number;
  endingType?: string;
  referenceWorks?: string;
  sellingPoint?: string;
}
