"use client";

import React, { useMemo } from "react";
import { PROMPT_VARIABLES } from "@/shared/types";
import type { PromptTemplate, Book } from "@/app/types";
import styles from "./prompt-preview.module.css";

// ============ Variable Resolution ============

/**
 * Build a map from variable name to placeholder value using book data.
 * For variables without corresponding book data, use `[未设置]`.
 */
function buildVariableMap(book: Book): Record<string, string> {
  const map: Record<string, string> = {};
  for (const v of PROMPT_VARIABLES) {
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
        map[v.name] = "[未设置]";
        break;
      case "outputFormat":
        // outputFormat is resolved per-functionKey; leave as-is for now
        // (the constant is not yet defined in the codebase)
        map[v.name] = "[输出格式]";
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
    if (varName in variableMap) return variableMap[varName];
    // Unmapped variables (template-specific): show [未设置]
    return "[未设置]";
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
  /** The book selected in the toolbar for preview */
  book: Book | null;
}

// ============ Component ============

const PromptPreview = React.memo(function PromptPreview({
  template,
  editContent,
  hasSeparator,
  systemPart,
  book,
}: PromptPreviewProps) {
  // ---- Variable resolution ----
  const variableMap = useMemo(() => {
    if (!book) return null;
    return buildVariableMap(book);
  }, [book]);

  // Build the full resolved preview content
  const resolvedPreview = useMemo(() => {
    if (!template || !variableMap) return "";

    // Preview shows the full template with variables replaced.
    // The --- separator is internal; do not render it as visible text.
    const fullTemplate = hasSeparator
      ? `${systemPart}\n\n${editContent}`
      : editContent;

    return substituteVariables(fullTemplate, variableMap);
  }, [template, editContent, hasSeparator, systemPart, variableMap]);

  return (
    <div className={styles.previewPanel}>
      {/* ===== Preview Content ===== */}
      <div className={styles.previewContent}>
        {!template ? (
          <div className={styles.previewEmpty}>
            从左侧列表中选择一个功能查看预览
          </div>
        ) : !book ? (
          <div className={styles.previewEmpty}>
            请在顶部选择一本书以预览提示词
          </div>
        ) : (
          resolvedPreview
        )}
      </div>
    </div>
  );
});

export default PromptPreview;
