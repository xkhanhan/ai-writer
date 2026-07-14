"use client";

import { useEffect, useCallback, useRef } from "react";
import { useAiContext } from "../context/ai-context";

interface UseEditorContextProps {
  content: string;
  chapterId: string | null;
  bookId: string;
  chapterTitle?: string | null;
  bookTitle?: string | null;
}

export function useEditorContext({
  content,
  chapterId,
  bookId,
  chapterTitle = null,
  bookTitle = null,
}: UseEditorContextProps) {
  const { updateEditorContext } = useAiContext();
  const contentRef = useRef(content);

  // Update ref in effect to avoid accessing during render
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  // Calculate word count
  const wordCount = content.replace(/\s/g, "").length;

  // Get selected text from textarea
  const getSelectedText = useCallback((): string | null => {
    const el = document.querySelector<HTMLTextAreaElement>("[data-ai-editor] textarea");
    if (!el) return null;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    if (start === end || start == null || end == null) return null;
    return contentRef.current.slice(start, end);
  }, []);

  // Get cursor position
  const getCursorPosition = useCallback((): number | null => {
    const el = document.querySelector<HTMLTextAreaElement>("[data-ai-editor] textarea");
    if (!el) return null;
    return el.selectionStart;
  }, []);

  // Update context when content changes
  useEffect(() => {
    updateEditorContext({
      content,
      chapterId,
      chapterTitle,
      bookTitle,
      bookId,
      wordCount,
      selectedText: getSelectedText(),
      cursorPosition: getCursorPosition(),
    });
  }, [content, chapterId, chapterTitle, bookTitle, bookId, wordCount, getSelectedText, getCursorPosition, updateEditorContext]);

  // Listen for selection changes
  useEffect(() => {
    const handleSelectionChange = () => {
      updateEditorContext({
        selectedText: getSelectedText(),
        cursorPosition: getCursorPosition(),
      });
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [getSelectedText, getCursorPosition, updateEditorContext]);

  // Listen for AI adopt events
  useEffect(() => {
    const handleAdoptResult = (event: CustomEvent) => {
      const { content: adoptedContent, mode } = event.detail;
      if (mode === "QUICK") {
        // For quick mode, we might want to replace selection or append
        // This will be handled by the content editor
        console.log("AI result adopted:", adoptedContent);
      }
    };

    window.addEventListener("ai-adopt-result", handleAdoptResult as EventListener);
    return () => {
      window.removeEventListener("ai-adopt-result", handleAdoptResult as EventListener);
    };
  }, []);

  return {
    getSelectedText,
    getCursorPosition,
    wordCount,
  };
}