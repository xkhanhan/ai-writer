import { useCallback, useState } from "react";
import { handleApiError, showSuccess } from "@/app/utils/error-handler";
import type { Book, UpdateBookDTO } from "@/app/types";
import { deleteBook, getBookById, updateBook } from "@/app/pages/books/api/books";

export function useBook(initialBook: Book) {
  const [book, setBook] = useState<Book>(initialBook);
  const [loading, setLoading] = useState(false);

  const refreshBook = useCallback(async () => {
    setLoading(true);
    try {
      const nextBook = await getBookById(initialBook.id);
      setBook(nextBook);
    } catch (error) {
      handleApiError(error, "获取书籍信息失败");
    } finally {
      setLoading(false);
    }
  }, [initialBook.id]);

  const update = useCallback(
    async (data: UpdateBookDTO) => {
      setLoading(true);
      try {
        await updateBook(initialBook.id, data);
        const nextBook = await getBookById(initialBook.id);
        setBook(nextBook);
        showSuccess("保存成功");
        return nextBook;
      } catch (error) {
        handleApiError(error, "保存失败");
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [initialBook.id]
  );

  const remove = useCallback(async () => {
    setLoading(true);
    try {
      await deleteBook(initialBook.id);
      showSuccess("删除成功");
    } catch (error) {
      handleApiError(error, "删除失败");
      throw error;
    } finally {
      setLoading(false);
    }
  }, [initialBook.id]);

  return {
    book,
    loading,
    refreshBook,
    update,
    remove
  };
}
