"use client";

import React, { useCallback } from "react";
import { showSuccess } from "@/app/utils/error-handler";
import { PROMPT_VARIABLES } from "@/shared/types";
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
  /** Whether the variable panel is currently visible */
  showVariables: boolean;
  /** Callback when edit content changes */
  onEditChange: (value: string) => void;
}

// ============ Component ============

const PromptEditor = React.memo(function PromptEditor({
  template,
  isSystemDefault,
  editContent,
  showVariables,
  onEditChange,
}: PromptEditorProps) {
  // Copy a variable name to clipboard
  const handleCopyVariable = useCallback(
    (varName: string) => {
      void navigator.clipboard?.writeText(`\${${varName}}`);
      showSuccess(`已复制 \${${varName}}`);
    },
    [],
  );

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
      {/* ===== Collapsible Variable Panel ===== */}
      <div
        className={`${styles.varPanel} ${showVariables ? styles.varPanelOpen : styles.varPanelClosed}`}
      >
        <div className={styles.varPanelInner}>
          <div className={styles.varGrid}>
            {PROMPT_VARIABLES.map((v) => (
              <div
                key={v.name}
                className={`${styles.varItem} ${v.readOnly ? styles.varItemReadOnly : ""}`}
                title={
                  v.readOnly
                    ? `${v.displayName}（不可编辑）`
                    : `${v.displayName} — 点击复制`
                }
                onClick={
                  v.readOnly
                    ? undefined
                    : () => handleCopyVariable(v.name)
                }
                role={v.readOnly ? undefined : "button"}
                tabIndex={v.readOnly ? undefined : 0}
                onKeyDown={
                  v.readOnly
                    ? undefined
                    : (e: React.KeyboardEvent) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleCopyVariable(v.name);
                        }
                      }
                }
              >
                <span className={styles.varItemName}>
                  {`${"${"}${v.name}${"}"}`}
                </span>
                <span className={styles.varItemDesc}>{v.description}</span>
                {!v.readOnly && (
                  <span className={styles.varItemHint}>复制</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== Editor Content ===== */}
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
