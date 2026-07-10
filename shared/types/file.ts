// Folder and file domain types

export interface Folder {
  id: string;
  bookId: string;
  category: string;
  name: string;
  files: BookFile[];
  createdAt: string;
  updatedAt: string;
}

export interface BookFile {
  id: string;
  folderId: string;
  name: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFolderDTO {
  bookId: string;
  category: string;
  name: string;
}

export interface CreateFileDTO {
  folderId: string;
  name: string;
}

export interface UpdateFileDTO {
  name?: string;
  content?: string;
}
