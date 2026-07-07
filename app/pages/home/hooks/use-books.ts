import { useCallback, useState } from "react";
import { createBook, deleteBook as apiDeleteBook, getBookOptions, getBooks } from "@/app/pages/home/api/books";
import { showError, showSuccess } from "@/app/utils/error-handler";
import type { Book, BookOptions, CreateBookDTO } from "@/app/types";

export function useBooks(initialBooks: Book[] = []) {
  const [books, setBooks] = useState<Book[]>(initialBooks);
  const [loading, setLoading] = useState(false);

  const refreshBooks = useCallback(async () => {
    setLoading(true);
    const result = await getBooks();
    if (result.ok) {
      setBooks(result.data);
    } else {
      showError(result.error || "获取书籍列表失败");
    }
    setLoading(false);
  }, []);

  const addBook = useCallback(
    async (data: CreateBookDTO) => {
      const result = await createBook(data);
      if (result.ok) {
        showSuccess("书籍创建成功");
        await refreshBooks();
        return result.data;
      }
      showError(result.error || "创建书籍失败");
      return null;
    },
    [refreshBooks]
  );

  const removeBook = useCallback(
    async (id: string) => {
      const result = await apiDeleteBook(id);
      if (result.ok) {
        showSuccess("书籍已删除");
        await refreshBooks();
        return true;
      }
      showError(result.error || "删除书籍失败");
      return false;
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
    const result = await getBookOptions();
    if (result.ok) {
      setOptions(result.data);
    } else {
      showError(result.error || "获取书籍选项失败");
    }
  }, []);

  return {
    options,
    refreshOptions
  };
}
