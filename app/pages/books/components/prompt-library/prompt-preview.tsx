"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Button, Select } from "antd";
import { showSuccess } from "@/app/utils/error-handler";
import { PROMPT_VARIABLES } from "@/shared/types";
import type { PromptTemplate, Book } from "@/app/types";
import { getBooks } from "@/app/pages/home/api/books";
import styles from "./prompt-preview.module.css";

// ============ Variable Resolution ============

/**
 * Build a map from variable name to placeholder value using book data.
 * For variables without corresponding book data, use `[未设置]`.
 */
function buildVariableMap(book: Book): Record<string, string> {
  const map: Record<string, string> = {};
  for (const v of PROMPT_VARIABLES) {
    if (v.readOnly) {
      map[v.name] = "";
      continue;
    }
    switch (v.name) {
      case "bookTitle":
        map[v.name] = book.title || "[未设置]";
        break;
      case "bookGenre":
        map[v.name] = book.genre || "[未设置]";
        break;
      case "bookSynopsis":
        map[v.name] = book.description || "[未设置]";
        break;
      case "bookCoreSellingPoint":
        map[v.name] = book.sellingPoint || "[未设置]";
        break;
      case "bookCharacterCount":
        map[v.name] = book.targetWordCount
          ? `${book.targetWordCount}`
          : "[未设置]";
        break;
      case "userSupplement":
        map[v.name] = "[用户补充]";
        break;
      default:
        map[v.name] = "";
    }
  }
  return map;
}

/**
 * Replace all `${varName}` references in a template string with
 * real values from the variable map.
 */
function substituteVariables(
  template: string,
  variableMap: Record<string, string>,
): string {
  return template.replace(/\$\{(\w+)\}/g, (_match, varName: string) => {
    return varName in variableMap ? variableMap[varName] : `[${varName}]`;
  });
}

// ============ Props ============

interface PromptPreviewProps {
  template: PromptTemplate | null;
  editContent: string;
  /** Whether there is a --- separator in the template (system prefix exists) */
  hasSeparator: boolean;
  /** The system-fixed part before the --- separator */
  systemPart: string;
  /** @deprecated Use the internal book selector instead */
  book?: Book;
  /** Current editor view: "editor" or "preview" */
  viewMode: "editor" | "preview";
  /** Callback to switch view mode */
  onViewModeChange: (mode: "editor" | "preview") => void;
}

// ============ Component ============

const PromptPreview = React.memo(function PromptPreview({
  template,
  editContent,
  hasSeparator,
  systemPart,
  viewMode,
  onViewModeChange,
}: PromptPreviewProps) {
  // ---- Book selector state ----
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [booksLoading, setBooksLoading] = useState(false);

  // Fetch all books on mount
  useEffect(() => {
    let cancelled = false;
    setBooksLoading(true);
    getBooks()
      .then((res) => {
        if (!cancelled && res.ok) {
          setAllBooks(res.data);
        }
      })
      .finally(() => {
        if (!cancelled) setBooksLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const selectedBook = useMemo(() => {
    if (selectedBookId) {
      return allBooks.find((b) => b.id === selectedBookId) ?? null;
    }
    return allBooks.length > 0 ? allBooks[0] : null;
  }, [selectedBookId, allBooks]);

  const bookOptions = useMemo(
    () =>
      allBooks.map((b) => ({
        value: b.id,
        label: b.title,
      })),
    [allBooks],
  );

  // ---- Variable resolution ----
  const variableMap = useMemo(() => {
    if (!selectedBook) return null;
    return buildVariableMap(selectedBook);
  }, [selectedBook]);

  // Build the full resolved preview content
  const resolvedPreview = useMemo(() => {
    if (!template || !variableMap) return "";

    // Combine system prefix (if any) with user content
    const fullTemplate = hasSeparator
      ? `${systemPart}\n---\n\n${editContent}`
      : editContent;

    return substituteVariables(fullTemplate, variableMap);
  }, [template, editContent, hasSeparator, systemPart, variableMap]);

  const handleCopyResolved = useCallback(() => {
    void navigator.clipboard?.writeText(resolvedPreview);
    showSuccess("已复制预览内容");
  }, [resolvedPreview]);

  const noBookSelected = !selectedBook && !booksLoading;

  return (
    <div className={styles.previewPanel}>
      {/* ===== Toolbar ===== */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <span className={styles.toolbarTitle}>
            {template?.displayName ?? "预览"}
          </span>
          <div className={styles.toolbarSep} />
          <span className={styles.previewLabel}>预览模式</span>
        </div>
        <div className={styles.toolbarRight}>
          {/* Book selector */}
          <Select
            className={styles.bookSelector}
            size="small"
            placeholder="选择一本书"
            options={bookOptions}
            value={selectedBookId ?? undefined}
            onChange={(value: string) => setSelectedBookId(value)}
            loading={booksLoading}
            notFoundContent={booksLoading ? "加载中..." : "暂无书籍"}
            allowClear
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
            }
          />

          <Button
            size="small"
            onClick={handleCopyResolved}
            disabled={!template || noBookSelected}
          >
            复制预览
          </Button>

          {/* View mode toggle */}
          <div
            style={{
              display: "flex",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              overflow: "hidden",
            }}
          >
            <button
              style={{
                padding: "0 10px",
                height: 24,
                fontSize: 12,
                border: "none",
                borderRight: "1px solid var(--border)",
                background:
                  viewMode === "editor"
                    ? "var(--accent-soft)"
                    : "var(--panel)",
                color:
                  viewMode === "editor"
                    ? "var(--accent)"
                    : "var(--ink-tertiary)",
                cursor: "pointer",
                fontFamily: "var(--font-body)",
                fontWeight: viewMode === "editor" ? 600 : 400,
                transition: "all 0.12s ease",
              }}
              onClick={() => onViewModeChange("editor")}
            >
              编辑
            </button>
            <button
              style={{
                padding: "0 10px",
                height: 24,
                fontSize: 12,
                border: "none",
                background:
                  viewMode === "preview"
                    ? "var(--accent-soft)"
                    : "var(--panel)",
                color:
                  viewMode === "preview"
                    ? "var(--accent)"
                    : "var(--ink-tertiary)",
                cursor: "pointer",
                fontFamily: "var(--font-body)",
                fontWeight: viewMode === "preview" ? 600 : 400,
                transition: "all 0.12s ease",
              }}
              onClick={() => onViewModeChange("preview")}
            >
              预览
            </button>
          </div>
        </div>
      </div>

      {/* ===== Preview Content ===== */}
      <div className={styles.previewContent}>
        {!template ? (
          <div className={styles.previewEmpty}>
            从左侧列表中选择一个功能查看预览
          </div>
        ) : noBookSelected ? (
          <div className={styles.previewEmpty}>
            请先选择一本书以预览提示词
          </div>
        ) : (
          resolvedPreview
        )}
      </div>
    </div>
  );
});

export default PromptPreview;
