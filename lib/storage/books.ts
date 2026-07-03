import { randomUUID } from "node:crypto";
import { readJsonFile, writeJsonFile } from "@/lib/storage/file";

export type Book = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};

type BooksStore = {
  books: Book[];
};

const emptyStore: BooksStore = {
  books: []
};

export async function listBooks() {
  const store = await readJsonFile<BooksStore>("books.json", emptyStore);
  return store.books.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function createBook(input: { title: string; description: string }) {
  const title = input.title.trim();
  const description = input.description.trim();

  if (!title) {
    throw new Error("书名不能为空。");
  }

  if (title.length > 60) {
    throw new Error("书名长度不能超过 60 个字符。");
  }

  if (description.length > 500) {
    throw new Error("简介长度不能超过 500 个字符。");
  }

  const store = await readJsonFile<BooksStore>("books.json", emptyStore);
  const now = new Date().toISOString();

  const book: Book = {
    id: randomUUID(),
    title,
    description,
    createdAt: now,
    updatedAt: now
  };

  await writeJsonFile("books.json", {
    books: [book, ...store.books]
  });

  return book;
}
