import { client } from "@/app/api-client";
import type { Result } from "@/app/api-client";
import type { Book, UpdateBookDTO } from "@/app/types";

export async function getBookById(id: string): Promise<Result<Book>> {
  return client.get<Book>(`/api/books/${id}`);
}

export async function updateBook(id: string, data: UpdateBookDTO): Promise<Result<void>> {
  return client.patch(`/api/books/${id}`, data);
}

export async function deleteBook(id: string): Promise<Result<void>> {
  return client.delete(`/api/books/${id}`);
}
