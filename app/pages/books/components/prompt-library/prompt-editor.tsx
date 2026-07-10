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
  /** The user-editable part of the template (after --- separator) */
  editContent: string;
  /** Callback when edit content changes */
  onEditChange: (value: string) => void;
}

// ============ Component ============

const PromptEditor = React.memo(function PromptEditor({
  template,
  isSystemDefault,
  editContent,
  onEditChange,
}: PromptEditorProps) {
  if (!template) {
    return (
      <div className={styles.editorPanel}>
        <div className={styles.contentArea}>
          <div className={styles.editorTextarea} style={{ opacity: 0.5 }}>
            从左侧列表中选择一个功能
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.editorPanel}>
      <div className={styles.contentArea}>
        <textarea
          className={styles.editorTextarea}
          value={editContent}
          onChange={(e) => onEditChange(e.target.value)}
          spellCheck={false}
          readOnly={isSystemDefault}
        />
      </div>
    </div>
  );
});

export default PromptEditor;
