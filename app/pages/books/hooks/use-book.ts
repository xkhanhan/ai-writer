import { useCallback, useState } from "react";
import { showError, showSuccess } from "@/app/utils/error-handler";
import type { Book, UpdateBookDTO } from "@/app/types";
import { deleteBook, getBookById, updateBook } from "@/app/pages/books/api/books";

export function useBook(initialBook: Book) {
  const [book, setBook] = useState<Book>(initialBook);
  const [loading, setLoading] = useState(false);

  const refreshBook = useCallback(async () => {
    setLoading(true);
    const result = await getBookById(initialBook.id);
    if (result.ok) {
      setBook(result.data);
    } else {
      showError(result.error || "获取书籍信息失败");
    }
    setLoading(false);
  }, [initialBook.id]);

  const update = useCallback(
    async (data: UpdateBookDTO) => {
      setLoading(true);
      const updateResult = await updateBook(initialBook.id, data);
      if (!updateResult.ok) {
        showError(updateResult.error || "保存失败");
        setLoading(false);
        return null;
      }
      const fetchResult = await getBookById(initialBook.id);
      if (fetchResult.ok) {
        setBook(fetchResult.data);
        showSuccess("保存成功");
        setLoading(false);
        return fetchResult.data;
      }
      showError(fetchResult.error || "保存成功但获取最新数据失败");
      setLoading(false);
      return null;
    },
    [initialBook.id]
  );

  const remove = useCallback(async () => {
    setLoading(true);
    const result = await deleteBook(initialBook.id);
    if (result.ok) {
      showSuccess("删除成功");
      setLoading(false);
      return true;
    }
    showError(result.error || "删除失败");
    setLoading(false);
    return false;
  }, [initialBook.id]);

  return {
    book,
    loading,
    refreshBook,
    update,
    remove
  };
}
