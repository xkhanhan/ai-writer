import { client } from "@/app/api-client";
import type { Book, BookOptions, CreateBookDTO } from "@/app/types";

export async function getBooks(): Promise<Book[]> {
  const res = await client.get<{ success: boolean; books: Book[] }>("/api/books");
  return res.books;
}

export async function createBook(data: CreateBookDTO): Promise<Book> {
  const res = await client.post<{ success: boolean; book: Book }, CreateBookDTO>("/api/books", data);
  return res.book;
}

export async function getBookOptions(): Promise<BookOptions> {
  const res = await client.get<{ success: boolean; options: BookOptions }>("/api/book-options");
  return res.options;
}

export async function deleteBook(id: string): Promise<void> {
  await client.delete<{ success: boolean }>(`/api/books/${id}`);
}
