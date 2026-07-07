import { client } from "@/app/api-client";
import type { Result } from "@/app/api-client";
import type { Book, BookOptions, CreateBookDTO } from "@/app/types";

export async function getBooks(): Promise<Result<Book[]>> {
  const res = await client.get<{ success: boolean; books: Book[] }>("/api/books");
  if (!res.ok) return res;
  return { ok: true, data: res.data.books };
}

export async function createBook(data: CreateBookDTO): Promise<Result<Book>> {
  const res = await client.post<{ success: boolean; book: Book }, CreateBookDTO>("/api/books", data);
  if (!res.ok) return res;
  return { ok: true, data: res.data.book };
}

export async function getBookOptions(): Promise<Result<BookOptions>> {
  const res = await client.get<{ success: boolean; options: BookOptions }>("/api/book-options");
  if (!res.ok) return res;
  return { ok: true, data: res.data.options };
}

export async function deleteBook(id: string): Promise<Result<void>> {
  return client.delete(`/api/books/${id}`);
}
