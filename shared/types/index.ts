// 跨层共享的类型定义（app/ 和 shared/ 都可以导入）

// 标签分类（支持无限层级）
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
