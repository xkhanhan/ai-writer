import { loadPublicAiConfig } from "@/server/ai/ai-config-store";
import { getBookOptions } from "@/server/storage/book-options-store";
import { listBooks } from "@/server/storage/book-store";
import AppShell from "@/app/components/app-shell";

type PageProps = {
  searchParams?: Promise<{
    view?: string;
    bookId?: string;
  }>;
};

export default async function Page({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const view =
    params.view === "workspace" || params.view === "settings" ? params.view : "home";
  const selectedBookId = params.bookId ?? null;

  const [books, bookOptions] = await Promise.all([
    listBooks(),
    getBookOptions(),
  ]);
  const aiConfig = loadPublicAiConfig();

  const selectedBook =
    selectedBookId ? books.find((book) => book.id === selectedBookId) ?? null : null;

  return (
    <AppShell
      initialBooks={books}
      initialBookOptions={bookOptions}
      initialAiConfig={aiConfig}
      initialView={selectedBook ? view : view === "settings" ? "settings" : "home"}
      initialSelectedBook={selectedBook}
    />
  );
}
