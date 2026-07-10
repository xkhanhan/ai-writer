// Tag category domain types

export interface TagCategory {
  id: string;
  bookId: string;
  name: string;
  code: string;
  parentId?: string;
  description?: string;
  sortOrder: number;
  children?: TagCategory[];
}

export interface CreateTagCategoryDTO {
  name: string;
  code?: string;
  parentId?: string;
  description?: string;
}

export interface UpdateTagCategoryDTO {
  name?: string;
  code?: string;
  parentId?: string;
  description?: string;
  sortOrder?: number;
}
