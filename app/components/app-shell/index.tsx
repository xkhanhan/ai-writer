"use client";

import { useCallback, useEffect, useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import type { AiConfig, Book, BookOptions } from "@/app/types";
import HomePage from "@/app/pages/home";
import BookWorkspace from "@/app/pages/books";
import AiConfigForm from "@/app/pages/settings-ai";
import styles from "./index.module.css";

type ViewType = "home" | "workspace" | "settings";

interface AppShellProps {
  initialBooks: Book[];
  initialBookOptions: BookOptions;
  initialAiConfig: AiConfig;
  initialView: ViewType;
  initialSelectedBook: Book | null;
}

export default function AppShell({
  initialBooks,
  initialBookOptions,
  initialAiConfig,
  initialView,
  initialSelectedBook
}: AppShellProps) {
  const router = useRouter();
  const [currentView, setCurrentView] = useState<ViewType>(initialView);
  const [selectedBook, setSelectedBook] = useState<Book | null>(initialSelectedBook);

  const syncUrl = useCallback(
    (nextView: ViewType, nextBook: Book | null) => {
      const search = new URLSearchParams();

      if (nextView !== "home") {
        search.set("view", nextView);
      }

      if (nextView === "workspace" && nextBook) {
        search.set("bookId", nextBook.id);
      }

      const query = search.toString();
      startTransition(() => {
        router.replace(query ? `/?${query}` : "/", { scroll: false });
      });
    },
    [router]
  );

  const handleSelectBook = useCallback(
    (book: Book) => {
      setSelectedBook(book);
      setCurrentView("workspace");
      syncUrl("workspace", book);
    },
    [syncUrl]
  );

  const handleBackToHome = useCallback(() => {
    setSelectedBook(null);
    setCurrentView("home");
    syncUrl("home", null);
  }, [syncUrl]);

  const handleGoToSettings = useCallback(() => {
    setCurrentView("settings");
    syncUrl("settings", null);
  }, [syncUrl]);

  // 监听 Topbar 设置按钮的自定义事件
  useEffect(() => {
    const handler = () => handleGoToSettings();
    window.addEventListener("navigate-settings", handler);
    return () => window.removeEventListener("navigate-settings", handler);
  }, [handleGoToSettings]);

  if (currentView === "workspace" && selectedBook) {
    return (
      <div className={styles["wrapper--fullscreen"]}>
        <BookWorkspace book={selectedBook} onBack={handleBackToHome} />
      </div>
    );
  }

  if (currentView === "settings") {
    return (
      <div className={styles["wrapper--fullscreen"]}>
        <AiConfigForm initialConfig={initialAiConfig} initialBooks={initialBooks} onBack={handleBackToHome} />
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <HomePage
          initialBooks={initialBooks}
          initialBookOptions={initialBookOptions}
          onSelectBook={handleSelectBook}
        />
    </div>
  );
}
