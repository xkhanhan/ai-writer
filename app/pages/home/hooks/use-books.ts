import { useCallback, useState } from "react";
import { createBook, deleteBook as apiDeleteBook, getBookOptions, getBooks } from "@/app/pages/home/api/books";
import { handleApiError, showSuccess } from "@/app/utils/error-handler";
import type { Book, BookOptions, CreateBookDTO } from "@/app/types";

export function useBooks(initialBooks: Book[] = []) {
  const [books, setBooks] = useState<Book[]>(initialBooks);
  const [loading, setLoading] = useState(false);

  const refreshBooks = useCallback(async () => {
    setLoading(true);
    try {
      const nextBooks = await getBooks();
      setBooks(nextBooks);
    } catch (error) {
      handleApiError(error, "获取书籍列表失败");
    } finally {
      setLoading(false);
    }
  }, []);

  const addBook = useCallback(
    async (data: CreateBookDTO) => {
      try {
        const newBook = await createBook(data);
        showSuccess("书籍创建成功");
        await refreshBooks();
        return newBook;
      } catch (error) {
        handleApiError(error, "创建书籍失败");
        throw error;
      }
    },
    [refreshBooks]
  );

  const removeBook = useCallback(
    async (id: string) => {
      try {
        await apiDeleteBook(id);
        showSuccess("书籍已删除");
        await refreshBooks();
      } catch (error) {
        handleApiError(error, "删除书籍失败");
        throw error;
      }
    },
    [refreshBooks]
  );

  return {
    books,
    loading,
    refreshBooks,
    addBook,
    removeBook
  };
}

export function useBookOptions(initialOptions: BookOptions) {
  const [options, setOptions] = useState<BookOptions>(initialOptions);

  const refreshOptions = useCallback(async () => {
    try {
      const nextOptions = await getBookOptions();
      setOptions(nextOptions);
    } catch (error) {
      handleApiError(error, "获取书籍选项失败");
    }
  }, []);

  return {
    options,
    refreshOptions
  };
}
