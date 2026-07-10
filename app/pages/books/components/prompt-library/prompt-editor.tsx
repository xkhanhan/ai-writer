"use client";

import React, { useCallback } from "react";
import { Button, Tooltip } from "antd";
import {
  ThunderboltOutlined,
  SaveOutlined,
  DeleteOutlined,
  CopyOutlined,
} from "@ant-design/icons";
import { PROMPT_VARIABLES } from "@/shared/types";
import { showSuccess } from "@/app/utils/error-handler";
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
  /** Whether there are unsaved changes */
  dirty: boolean;
  /** Whether the current template is the active one */
  isActive: boolean;
  /** Whether a save/copy/delete operation is in progress */
  saving: boolean;
  /** Whether the variable panel is currently visible */
  showVariables: boolean;
  /** Current editor view: "editor" or "preview" */
  viewMode: "editor" | "preview";
  /** Callback when edit content changes */
  onEditChange: (value: string) => void;
  /** Callback to toggle variable panel visibility */
  onToggleVariables: () => void;
  /** Callback to save the template */
  onSave: () => void;
  /** Callback to delete a custom template */
  onDelete: () => void;
  /** Callback to activate the current template */
  onActivate: () => void;
  /** Callback to copy a system default as a custom template */
  onCopyAsCustom: () => void;
  /** Callback to switch view mode */
  onViewModeChange: (mode: "editor" | "preview") => void;
}

// ============ Component ============

const PromptEditor = React.memo(function PromptEditor({
  template,
  isSystemDefault,
  editContent,
  dirty,
  isActive,
  saving,
  showVariables,
  viewMode,
  onEditChange,
  onToggleVariables,
  onSave,
  onDelete,
  onActivate,
  onCopyAsCustom,
  onViewModeChange,
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
        <div className={styles.toolbar}>
          <div className={styles.toolbarLeft}>
            <span className={styles.toolbarTitle}>提示词库</span>
          </div>
        </div>
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
      {/* ===== Top Toolbar ===== */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <span className={styles.toolbarTitle}>{template.displayName}</span>
          <div className={styles.toolbarSep} />
          {template.description && (
            <span className={styles.toolbarDesc}>{template.description}</span>
          )}
        </div>
        <div className={styles.toolbarRight}>
          <Button
            size="small"
            onClick={onToggleVariables}
            type={showVariables ? "default" : "text"}
          >
            变量
          </Button>

          {isSystemDefault && (
            <Tooltip title="复制系统默认为自定义模板">
              <Button
                size="small"
                icon={<CopyOutlined />}
                onClick={onCopyAsCustom}
                loading={saving}
              >
                复制为自定义
              </Button>
            </Tooltip>
          )}

          <Button
            size="small"
            icon={<ThunderboltOutlined />}
            onClick={onActivate}
            type={isActive ? "default" : "primary"}
            disabled={isActive || saving}
            loading={saving}
          >
            {isActive ? "已激活" : "激活"}
          </Button>

          {!isSystemDefault && (
            <Button
              size="small"
              icon={<SaveOutlined />}
              onClick={onSave}
              type="primary"
              disabled={!dirty || saving}
              loading={saving}
            >
              保存
            </Button>
          )}

          {!isSystemDefault && (
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={onDelete}
              disabled={saving}
              loading={saving}
            />
          )}

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
