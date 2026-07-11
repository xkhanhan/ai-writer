"use client";

import React, { useMemo, useEffect, useState } from "react";
import type { PromptTemplate, Book } from "@/app/types";
import { resolvePreview, type PreviewResult } from "../../api/preview";
import styles from "./prompt-preview.module.css";

// ============ Props ============

interface PromptPreviewProps {
  template: PromptTemplate | null;
  editContent: string;
  hasSeparator: boolean;
  systemPart: string;
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
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Build the full template text
  const fullTemplate = useMemo(() => {
    if (!template) return "";
    return hasSeparator
      ? `${systemPart}\n\n${editContent}`
      : editContent;
  }, [template, editContent, hasSeparator, systemPart]);

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

  const resolvedPreview = previewResult?.resolved ?? "";

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
