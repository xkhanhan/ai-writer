"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Modal, Select, Button, Tooltip } from "antd";
import {
  MenuOutlined,
  ThunderboltOutlined,
  SaveOutlined,
  DeleteOutlined,
  CopyOutlined,
} from "@ant-design/icons";
import { showError, showSuccess } from "@/app/utils/error-handler";
import { confirmDelete } from "@/shared/ui/confirm-delete";
import type { Book, PromptTemplate, PromptVariable } from "@/app/types";
import { validateTemplateVariables } from "@/app/types";
import { PROMPT_VARIABLES } from "@/shared/types";
import { getBooks } from "@/app/pages/home/api/books";
import { client } from "@/app/api-client";
import {
  fetchTemplates,
  updateTemplate,
  deleteTemplate,
  copyAsCustom,
  activateTemplateById,
} from "../../api/templates";
import PromptList, {
  PANEL_GROUPS,
  buildTemplateIndex,
} from "./prompt-list";
import PromptEditor from "./prompt-editor";
import PromptPreview from "./prompt-preview";
import styles from "./index.module.css";

// ============ Constants ============

/** Separator between system prompt and user prompt in the template field */
const SYSTEM_PROMPT_SEPARATOR = "\n---\n";

/** Split a full template string into system / user parts */
function splitTemplate(full: string): { systemPrompt: string; userPrompt: string } {
  const idx = full.indexOf(SYSTEM_PROMPT_SEPARATOR);
  if (idx === -1) return { systemPrompt: "", userPrompt: full };
  return {
    systemPrompt: full.slice(0, idx),
    userPrompt: full.slice(idx + SYSTEM_PROMPT_SEPARATOR.length),
  };
}

// ============ Helper: flatten all functionKeys ============

const ALL_FUNCTION_KEYS: string[] = PANEL_GROUPS.flatMap((g) =>
  g.functionKeys.map((fk) => fk.key),
);

// ============ Component ============

interface PromptLibraryProps {
  book?: Book;
}

export default function PromptLibrary({ book }: PromptLibraryProps) {
  // ===== State =====
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFunctionKey, setSelectedFunctionKey] = useState<string | null>(
    null,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Edit state — split into system / user parts
  const [editSystemPrompt, setEditSystemPrompt] = useState("");
  const [editUserPrompt, setEditUserPrompt] = useState("");
  const [dirty, setDirty] = useState(false);

  // Expanded groups (all expanded by default)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set(PANEL_GROUPS.map((g) => g.panelKey)),
  );

  // Variable panel visibility
  const [showVariables, setShowVariables] = useState(true);

  // Function-specific variables (fetched from backend per functionKey)
  const [functionVariables, setFunctionVariables] = useState<PromptVariable[]>(PROMPT_VARIABLES);

  // Mobile list panel toggle
  const [listOpen, setListOpen] = useState(false);

  // Unsaved changes modal
  const [unsavedModalOpen, setUnsavedModalOpen] = useState(false);
  const [pendingSwitchId, setPendingSwitchId] = useState<string | null>(null);
  const [pendingSwitchFn, setPendingSwitchFn] = useState<(() => void) | null>(null);

  // Book selector (for preview)
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [booksLoading, setBooksLoading] = useState(false);

  // ===== Load templates =====
  const loadTemplates = useCallback(async () => {
    setLoading(true);
    const res = await fetchTemplates();
    if (res.ok) setTemplates(res.data);
    setLoading(false);
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect -- async load calls setState in async callback */
  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // ===== Load books (for preview selector) =====
  /* eslint-disable react-hooks/set-state-in-effect -- async load calls setState in async callback */
  useEffect(() => {
    let cancelled = false;
    setBooksLoading(true);
    getBooks()
      .then((res) => {
        if (!cancelled && res.ok) {
          setAllBooks(res.data);
          // B-022: initialize selectedBookId so the Select shows a default value
          setSelectedBookId((prev) => (prev === null && res.data.length > 0 ? res.data[0].id : prev));
        }
      })
      .finally(() => {
        if (!cancelled) setBooksLoading(false);
      });
    return () => { cancelled = true; };
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // ===== Template index (by functionKey) =====
  const templateIndex = useMemo(
    () => buildTemplateIndex(templates),
    [templates],
  );

  // ===== Selected template lookup =====
  const selectedTemplate = useMemo(() => {
    if (!selectedId) return null;
    return templates.find((t) => t.id === selectedId) ?? null;
  }, [selectedId, templates]);

  // 编辑器分为 system prompt 和 user prompt 两块，完整展示所有内容

  const isSystemDefault =
    selectedTemplate?.isDefault === true && selectedTemplate?.bookId === null;

  // ===== Book selector (for preview) =====
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

  // ===== Sync edit state on selection change =====
  /* eslint-disable react-hooks/set-state-in-effect -- resetting local edit state on selection change */
  useEffect(() => {
    if (selectedTemplate) {
      const { systemPrompt, userPrompt } = splitTemplate(selectedTemplate.template);
      setEditSystemPrompt(systemPrompt);
      setEditUserPrompt(userPrompt);
      setDirty(false);
    }
  }, [selectedTemplate]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // ===== Auto-select first function on mount =====
  /* eslint-disable react-hooks/set-state-in-effect -- one-time auto-select initialization */
  useEffect(() => {
    if (loading || selectedFunctionKey !== null || templates.length === 0)
      return;

    for (const key of ALL_FUNCTION_KEYS) {
      if (templateIndex.has(key)) {
        setSelectedFunctionKey(key);
        // Auto-select the system default or first custom for this functionKey
        const entry = templateIndex.get(key)!;
        const first =
          entry.customs.length > 0 ? entry.customs[0] : entry.system;
        if (first) {
          setSelectedId(first.id);
        }
        return;
      }
    }
  }, [loading, selectedFunctionKey, templates.length, templateIndex]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // ===== Fetch function-specific variables when functionKey changes =====
  /* eslint-disable react-hooks/set-state-in-effect -- async load calls setState in async callback */
  useEffect(() => {
    if (!selectedFunctionKey) return;
    let cancelled = false;
    client
      .get<{ variables: PromptVariable[] }>(`/api/ai/variables?functionKey=${selectedFunctionKey}`)
      .then((res) => {
        if (!cancelled && res.ok && res.data.variables.length > 0) {
          setFunctionVariables(res.data.variables);
        } else if (!cancelled) {
          setFunctionVariables(PROMPT_VARIABLES);
        }
      })
      .catch(() => {
        if (!cancelled) setFunctionVariables(PROMPT_VARIABLES);
      });
    return () => { cancelled = true; };
  }, [selectedFunctionKey]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // ===== Warn on unsaved changes before page unload =====
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // ===== Group toggle =====
  const toggleGroup = useCallback((panelKey: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(panelKey)) next.delete(panelKey);
      else next.add(panelKey);
      return next;
    });
  }, []);

  // ===== Save helper =====
  const handleSave = useCallback(async (): Promise<boolean> => {
    if (!selectedTemplate || !dirty || isSystemDefault) return false;

    // Merge system + user back into full template
    const fullTemplate = editSystemPrompt
      ? editSystemPrompt + SYSTEM_PROMPT_SEPARATOR + editUserPrompt
      : editUserPrompt;

    // Sanitize user content (detect injection, warn)
    const sanitizeRes = await client.post<{ safe: boolean; warnings: string[]; cleaned: string }>(
      "/api/ai/sanitize",
      { content: fullTemplate },
    );
    if (sanitizeRes.ok && !sanitizeRes.data.safe) {
      const ok = await new Promise<boolean>((resolve) => {
        Modal.confirm({
          title: "提示词安全检查",
          content: `检测到以下潜在风险：\n${sanitizeRes.data.warnings.join("\n")}\n\n是否仍要保存？`,
          okText: "继续保存",
          cancelText: "返回修改",
          onOk: () => resolve(true),
          onCancel: () => resolve(false),
        });
      });
      if (!ok) return false;
    }

    const undefinedVars = validateTemplateVariables(
      fullTemplate,
      new Set(functionVariables.map((v) => v.name)),
    );
    if (undefinedVars.length > 0) {
      return new Promise<boolean>((resolve) => {
        Modal.confirm({
          title: "变量未定义",
          content: `模板中存在未定义的变量: ${undefinedVars.map((v) => `\${${v}}`).join(", ")}。是否仍要保存？`,
          okText: "继续保存",
          cancelText: "取消",
          onOk: async () => {
            setSaving(true);
            const res = await updateTemplate(selectedTemplate.id, {
              template: fullTemplate,
            });
            setSaving(false);
            if (res.ok) {
              showSuccess("模板已保存");
              setDirty(false);
              void loadTemplates();
              resolve(true);
            } else {
              showError(res.error);
              resolve(false);
            }
          },
          onCancel: () => {
            resolve(false);
          },
        });
      });
    }

    setSaving(true);
    const res = await updateTemplate(selectedTemplate.id, {
      template: fullTemplate,
    });
    setSaving(false);
    if (res.ok) {
      showSuccess("模板已保存");
      setDirty(false);
      void loadTemplates();
      return true;
    } else {
      showError(res.error);
      return false;
    }
  }, [
    selectedTemplate,
    dirty,
    isSystemDefault,
    editSystemPrompt,
    editUserPrompt,
    loadTemplates,
  ]);

  // ===== Select template (with save prompt) =====
  const handleSelect = useCallback(
    (templateId: string) => {
      if (templateId === selectedId) return;

      // Look up the template to get its functionKey
      const template = templates.find((t) => t.id === templateId);
      if (!template) return;

      const newFunctionKey = template.functionKey;

      const doSwitch = () => {
        setSelectedFunctionKey(newFunctionKey);
        setSelectedId(templateId);
      };

      if (dirty) {
        setPendingSwitchId(templateId);
        setPendingSwitchFn(() => doSwitch);
        setUnsavedModalOpen(true);
      } else {
        doSwitch();
      }
    },
    [selectedId, dirty, templates, handleSave],
  );

  // ===== Copy as custom =====
  const handleCopyAsCustom = useCallback(async () => {
    if (!selectedTemplate) return;
    setSaving(true);
    const res = await copyAsCustom(selectedTemplate.id);
    setSaving(false);
    if (res.ok) {
      showSuccess("已复制为自定义模板");
      setSelectedId(res.data.id);
      void loadTemplates();
    } else {
      showError(res.error);
    }
  }, [selectedTemplate, loadTemplates]);

  // ===== Delete custom template =====
  const handleDelete = useCallback(() => {
    if (!selectedTemplate || isSystemDefault) return;
    confirmDelete(selectedTemplate.displayName, async () => {
      setSaving(true);
      const res = await deleteTemplate(selectedTemplate.id);
      setSaving(false);
      if (res.ok) {
        showSuccess("模板已删除");
        setSelectedId(null);
        void loadTemplates();
      } else {
        showError(res.error);
      }
    });
  }, [selectedTemplate, isSystemDefault, loadTemplates]);

  // ===== Activate template =====
  const handleActivate = useCallback(async () => {
    if (!selectedTemplate) return;
    setSaving(true);
    const res = await activateTemplateById(selectedTemplate.id);
    setSaving(false);
    if (res.ok) {
      showSuccess("模板已激活");
      void loadTemplates();
    } else {
      showError(res.error);
    }
  }, [selectedTemplate, loadTemplates]);

  // ===== Edit change =====
  const handleSystemChange = useCallback((value: string) => {
    setEditSystemPrompt(value);
    setDirty(true);
  }, []);

  const handleUserChange = useCallback((value: string) => {
    setEditUserPrompt(value);
    setDirty(true);
  }, []);

  // ===== Copy variable to clipboard =====
  const handleCopyVariable = useCallback(
    (varName: string) => {
      void navigator.clipboard?.writeText(`\${${varName}}`);
      showSuccess(`已复制 \${${varName}}`);
    },
    [],
  );

  // ===== Unsaved modal handlers =====
  const handleUnsavedSave = useCallback(async () => {
    const saved = await handleSave();
    if (saved) showSuccess("已保存并切换");
    pendingSwitchFn?.();
    setUnsavedModalOpen(false);
    setPendingSwitchId(null);
    setPendingSwitchFn(null);
  }, [handleSave, pendingSwitchFn]);

  const handleUnsavedDiscard = useCallback(() => {
    pendingSwitchFn?.();
    setUnsavedModalOpen(false);
    setPendingSwitchId(null);
    setPendingSwitchFn(null);
  }, [pendingSwitchFn]);

  const handleUnsavedCancel = useCallback(() => {
    setUnsavedModalOpen(false);
    setPendingSwitchId(null);
    setPendingSwitchFn(null);
  }, []);

  // ===== Render =====
  return (
    <div className={styles.layoutRoot}>
      {/* Mobile backdrop */}
      <div
        className={`${styles.listBackdrop} ${listOpen ? styles.listBackdropVisible : ""}`}
        onClick={() => setListOpen(false)}
      />

      {/* Function List (sidebar / mobile overlay) */}
      <div className={`${styles.listWrapper} ${listOpen ? styles.listWrapperOpen : ""}`}>
        <PromptList
          loading={loading}
          selectedId={selectedId}
          templateIndex={templateIndex}
          expandedGroups={expandedGroups}
          onSelect={(id) => {
            handleSelect(id);
            setListOpen(false);
          }}
          onToggleGroup={toggleGroup}
          onClose={() => setListOpen(false)}
        />
      </div>

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* ===== Shared Toolbar ===== */}
        <div className={styles.sharedToolbar}>
          <div className={styles.sharedToolbarLeft}>
            <Button
              className={styles.hamburgerBtn}
              type="text"
              size="small"
              icon={<MenuOutlined />}
              onClick={() => setListOpen((v) => !v)}
              aria-label="切换功能列表"
            />
            <span className={styles.sharedToolbarTitle}>
              {selectedTemplate?.displayName ?? "提示词库"}
            </span>
            {selectedTemplate?.description && (
              <>
                <div className={styles.sharedToolbarSep} />
                <span className={styles.sharedToolbarDesc}>
                  {selectedTemplate.description}
                </span>
              </>
            )}
          </div>
          <div className={styles.sharedToolbarRight}>
            {/* Book selector for preview */}
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
              onClick={() => setShowVariables((v) => !v)}
              type={showVariables ? "default" : "text"}
            >
              变量
            </Button>

            {isSystemDefault && (
              <Tooltip title="复制系统默认为自定义模板">
                <Button
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => void handleCopyAsCustom()}
                  loading={saving}
                >
                  复制为自定义
                </Button>
              </Tooltip>
            )}

            <Button
              size="small"
              icon={<ThunderboltOutlined />}
              onClick={() => void handleActivate()}
              type={isSystemDefault || !(selectedTemplate?.isActive) ? "primary" : "default"}
              disabled={selectedTemplate?.isActive || saving}
              loading={saving}
            >
              {selectedTemplate?.isActive ? "已激活" : "激活"}
            </Button>

            {!isSystemDefault && (
              <Button
                size="small"
                icon={<SaveOutlined />}
                onClick={() => void handleSave()}
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
                onClick={handleDelete}
                disabled={saving}
                loading={saving}
                aria-label="删除模板"
              />
            )}
          </div>
        </div>

        {/* ===== Variable Panel (full-width, collapsible) ===== */}
        <div
          className={`${styles.varPanel} ${showVariables ? styles.varPanelOpen : styles.varPanelClosed}`}
        >
          <div className={styles.varPanelInner}>
            <div className={styles.varGrid}>
              {functionVariables.map((v) => (
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

        {/* ===== Split Area: Editor + Preview side-by-side ===== */}
        <div className={styles.splitArea}>
          <div className={styles.editorPane}>
            <PromptEditor
              template={selectedTemplate}
              isSystemDefault={isSystemDefault}
              systemPrompt={editSystemPrompt}
              userPrompt={editUserPrompt}
              onSystemChange={handleSystemChange}
              onUserChange={handleUserChange}
            />
          </div>
          <div className={styles.previewPane}>
            <PromptPreview
              systemPrompt={editSystemPrompt}
              userPrompt={editUserPrompt}
              book={selectedBook}
              functionKey={selectedTemplate?.functionKey}
            />
          </div>
        </div>
      </div>

      {/* Unsaved changes modal (3 buttons per PRD §3.13) */}
      <Modal
        open={unsavedModalOpen}
        title="未保存的修改"
        onCancel={handleUnsavedCancel}
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button onClick={handleUnsavedCancel}>取消</Button>
            <Button onClick={() => void handleUnsavedDiscard()}>不保存切换</Button>
            <Button type="primary" loading={saving} onClick={() => void handleUnsavedSave()}>保存并切换</Button>
          </div>
        }
        destroyOnClose
      >
        当前模板有未保存的修改，是否先保存？
      </Modal>
    </div>
  );
}
