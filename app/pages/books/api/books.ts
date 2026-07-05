import { client } from "@/app/api-client";
import type { Book, UpdateBookDTO } from "@/app/types";

export async function getBookById(id: string): Promise<Book> {
  return client.get<Book>(`/api/books/${id}`);
}

export async function updateBook(id: string, data: UpdateBookDTO): Promise<void> {
  await client.patch(`/api/books/${id}`, data);
}

export async function deleteBook(id: string): Promise<void> {
  await client.delete(`/api/books/${id}`);
}
