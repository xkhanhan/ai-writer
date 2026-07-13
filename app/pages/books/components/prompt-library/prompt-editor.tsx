"use client";

import React from "react";
import type { PromptTemplate } from "@/app/types";
import styles from "./prompt-editor.module.css";

// ============ Props ============

interface PromptEditorProps {
  /** Currently selected template (null when nothing selected) */
  template: PromptTemplate | null;
  /** Whether the template is a system default (read-only) */
  isSystemDefault: boolean;
  /** System prompt content (format constraints / JSON schema) */
  systemPrompt: string;
  /** User prompt content (role description + data sections) */
  userPrompt: string;
  /** Callback when system prompt changes */
  onSystemChange: (value: string) => void;
  /** Callback when user prompt changes */
  onUserChange: (value: string) => void;
}

// ============ Component ============

const PromptEditor = React.memo(function PromptEditor({
  template,
  isSystemDefault,
  systemPrompt,
  userPrompt,
  onSystemChange,
  onUserChange,
}: PromptEditorProps) {
  if (!template) {
    return (
      <div className={styles.editorPanel}>
        <div className={styles.emptyState}>
          从左侧列表中选择一个功能
        </div>
      </div>
    );
  }

  return (
    <div className={styles.editorPanel}>
      {/* System Prompt Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionBadge}>System</span>
          <span className={styles.sectionLabel}>格式约束 / 输出要求</span>
        </div>
        <textarea
          className={styles.sectionTextarea}
          value={systemPrompt}
          onChange={(e) => onSystemChange(e.target.value)}
          spellCheck={false}
          readOnly={isSystemDefault}
          placeholder="（无 System Prompt — 可选填格式约束、JSON schema 等）"
        />
      </div>

      {/* Divider */}
      <div className={styles.divider} />

      {/* User Prompt Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={`${styles.sectionBadge} ${styles.sectionBadgeUser}`}>User</span>
          <span className={styles.sectionLabel}>角色描述 + 数据上下文</span>
        </div>
        <textarea
          className={styles.sectionTextarea}
          value={userPrompt}
          onChange={(e) => onUserChange(e.target.value)}
          spellCheck={false}
          readOnly={isSystemDefault}
          placeholder="输入角色描述、数据上下文、变量占位符等"
        />
      </div>
    </div>
  );
});

export default PromptEditor;
