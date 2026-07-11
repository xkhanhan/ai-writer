"use client";

import React, { useMemo, useEffect, useState } from "react";
import type { PromptTemplate, Book } from "@/app/types";
import { resolvePreview, type PreviewResult } from "../../api/preview";
import styles from "./prompt-preview.module.css";

/**
 * Filter out system-only blocks from template text for preview display.
 * Removes JSON code blocks and "返回格式" sections that are internal
 * to the AI and should not be shown to the user.
 */
function filterSystemBlocks(text: string): string {
  // Remove ```json ... ``` code blocks (return format templates)
  let result = text.replace(/```json\s*\{[\s\S]*?\}\s*```/g, "");
  // Remove "## 返回格式" and "## 格式约束" sections up to next ## or end
  result = result.replace(/## 返回格式[\s\S]*?(?=## |\n---|\n*$)/g, "");
  result = result.replace(/## 格式约束[\s\S]*?(?=## |\n---|\n*$)/g, "");
  // Remove "## 审查输出要求" and "## 检查输出要求" sections
  result = result.replace(/## 审查输出要求[\s\S]*?(?=## |\n---|\n*$)/g, "");
  result = result.replace(/## 检查输出要求[\s\S]*?(?=## |\n---|\n*$)/g, "");
  // Remove "## 必须删除的模式" and "## 必须增加的元素" sections
  result = result.replace(/## 必须删除的模式[\s\S]*?(?=## |\n---|\n*$)/g, "");
  result = result.replace(/## 必须增加的元素[\s\S]*?(?=## |\n---|\n*$)/g, "");
  // Remove "## 输出格式" and "## 输出要求" sections
  result = result.replace(/## 输出格式[\s\S]*?(?=## |\n---|\n*$)/g, "");
  result = result.replace(/## 输出要求[\s\S]*?(?=## |\n---|\n*$)/g, "");
  // Clean up excessive blank lines
  result = result.replace(/\n{3,}/g, "\n\n");
  return result.trim();
}

// ============ Props ============

interface PromptPreviewProps {
  template: PromptTemplate | null;
  editContent: string;
  book: Book | null;
}

// ============ Component ============

const PromptPreview = React.memo(function PromptPreview({
  template,
  editContent,
  book,
}: PromptPreviewProps) {
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Build the full template text (use editContent which now contains the full template)
  const fullTemplate = useMemo(() => {
    if (!template) return "";
    // editContent is the full template content (editor shows full template)
    return editContent;
  }, [template, editContent]);

  // Call backend preview API when template or book changes
  useEffect(() => {
    if (!fullTemplate || !book) {
      setPreviewResult(null);
      return;
    }

    let cancelled = false;
    setPreviewLoading(true);

    resolvePreview(fullTemplate, book.id, template?.functionKey ?? "")
      .then((res) => {
        if (!cancelled && res.ok) {
          setPreviewResult(res.data);
        }
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });

    return () => { cancelled = true; };
  }, [fullTemplate, book, template?.functionKey]);

  // Filter system blocks from resolved preview
  const resolvedPreview = useMemo(() => {
    const raw = previewResult?.resolved ?? "";
    return raw ? filterSystemBlocks(raw) : "";
  }, [previewResult]);

  return (
    <div className={styles.previewPanel}>
      <div className={styles.previewContent}>
        {!template ? (
          <div className={styles.previewEmpty}>
            从左侧列表中选择一个功能查看预览
          </div>
        ) : !book ? (
          <div className={styles.previewEmpty}>
            请在顶部选择一本书以预览提示词
          </div>
        ) : previewLoading && !resolvedPreview ? (
          <div className={styles.previewEmpty}>加载中...</div>
        ) : (
          resolvedPreview
        )}
      </div>
    </div>
  );
});

export default PromptPreview;
