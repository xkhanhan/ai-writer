"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import type { Book } from "@/app/types";
import { resolvePreview, type PreviewResult } from "../../api/preview";
import styles from "./prompt-preview.module.css";

// ============ Props ============

interface PromptPreviewProps {
  /** System prompt content */
  systemPrompt: string;
  /** User prompt content */
  userPrompt: string;
  /** Selected book for variable resolution */
  book: Book | null;
  /** Function key for fetching variable definitions */
  functionKey?: string;
}

// ============ Debounce hook ============

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebounced(value), delayMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, delayMs]);

  return debounced;
}

// ============ Component ============

const PromptPreview = React.memo(function PromptPreview({
  systemPrompt,
  userPrompt,
  book,
  functionKey,
}: PromptPreviewProps) {
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Debounce both parts (500ms) to avoid excessive API calls
  const debouncedSystem = useDebouncedValue(systemPrompt, 500);
  const debouncedUser = useDebouncedValue(userPrompt, 500);

  // Build the full template for preview API
  const fullTemplate = debouncedSystem
    ? debouncedSystem + "\n---\n" + debouncedUser
    : debouncedUser;

  // Call backend preview API when debounced values change
  const fetchPreview = useCallback(async (template: string, bookId: string, fk: string) => {
    setPreviewLoading(true);
    try {
      const res = await resolvePreview(template, bookId, fk);
      if (res.ok) {
        setPreviewResult(res.data);
      }
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!fullTemplate || !book) {
      setPreviewResult(null);
      return;
    }
    void fetchPreview(fullTemplate, book.id, functionKey ?? "");
  }, [fullTemplate, book, functionKey, fetchPreview]);

  // Split resolved preview into system / user parts
  const resolvedSystem = previewResult?.resolved
    ? splitResolved(previewResult.resolved).systemPrompt
    : "";
  const resolvedUser = previewResult?.resolved
    ? splitResolved(previewResult.resolved).userPrompt
    : "";

  const noTemplate = !systemPrompt && !userPrompt;

  return (
    <div className={styles.previewPanel}>
      {noTemplate ? (
        <div className={styles.previewEmpty}>
          从左侧列表中选择一个功能查看预览
        </div>
      ) : !book ? (
        <div className={styles.previewEmpty}>
          请在顶部选择一本书以预览提示词
        </div>
      ) : (
        <>
          {/* System Prompt Preview */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionBadge}>System</span>
              <span className={styles.sectionLabel}>格式约束 / 输出要求</span>
            </div>
            <div className={styles.sectionContent}>
              {previewLoading && !resolvedSystem ? (
                <span className={styles.loadingHint}>加载中...</span>
              ) : resolvedSystem ? (
                resolvedSystem
              ) : (
                <span className={styles.emptyHint}>（无 System Prompt）</span>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className={styles.divider} />

          {/* User Prompt Preview */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={`${styles.sectionBadge} ${styles.sectionBadgeUser}`}>User</span>
              <span className={styles.sectionLabel}>角色描述 + 数据上下文（变量已替换）</span>
            </div>
            <div className={styles.sectionContent}>
              {previewLoading && !resolvedUser ? (
                <span className={styles.loadingHint}>加载中...</span>
              ) : resolvedUser ? (
                resolvedUser
              ) : (
                <span className={styles.emptyHint}>（无 User Prompt）</span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
});

// ============ Helpers ============

const RESOLVED_SEPARATOR = "\n---\n";

function splitResolved(full: string): { systemPrompt: string; userPrompt: string } {
  const idx = full.indexOf(RESOLVED_SEPARATOR);
  if (idx === -1) return { systemPrompt: "", userPrompt: full };
  return {
    systemPrompt: full.slice(0, idx),
    userPrompt: full.slice(idx + RESOLVED_SEPARATOR.length),
  };
}

export default PromptPreview;
