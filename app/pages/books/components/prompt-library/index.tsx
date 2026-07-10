"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Modal } from "antd";
import { showError, showSuccess } from "@/app/utils/error-handler";
import type { Book, PromptTemplate } from "@/app/types";
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

// ============ Helper: flatten all functionKeys ============

const ALL_FUNCTION_KEYS: string[] = PANEL_GROUPS.flatMap((g) =>
  g.functionKeys.map((fk) => fk.key),
);

// ============ Component ============

interface PromptLibraryProps {
  book: Book;
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

  // Edit state
  const [editTemplate, setEditTemplate] = useState("");
  const [dirty, setDirty] = useState(false);

  // Expanded groups (all expanded by default)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set(PANEL_GROUPS.map((g) => g.panelKey)),
  );

  // Variable panel visibility
  const [showVariables, setShowVariables] = useState(false);

  // Editor view mode
  const [viewMode, setViewMode] = useState<"editor" | "preview">("editor");

  // ===== Load templates =====
  const loadTemplates = useCallback(async () => {
    setLoading(true);
    const res = await fetchTemplates(book.id);
    if (res.ok) setTemplates(res.data);
    setLoading(false);
  }, [book.id]);

  /* eslint-disable react-hooks/set-state-in-effect -- async load calls setState in async callback */
  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);
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

  // ===== Template split by --- separator =====
  const { systemPart, userPart, hasSeparator } = useMemo(() => {
    if (!selectedTemplate) {
      return { systemPart: "", userPart: "", hasSeparator: false };
    }
    const parts = selectedTemplate.template.split("\n---\n");
    if (parts.length === 2) {
      return {
        systemPart: parts[0].trim(),
        userPart: parts[1].trim(),
        hasSeparator: true,
      };
    }
    return { systemPart: "", userPart: selectedTemplate.template, hasSeparator: false };
  }, [selectedTemplate]);

  const isSystemDefault =
    selectedTemplate?.isDefault === true && selectedTemplate?.bookId === null;

  // ===== Sync edit state on selection change =====
  /* eslint-disable react-hooks/set-state-in-effect -- resetting local edit state on selection change */
  useEffect(() => {
    if (selectedTemplate) {
      setEditTemplate(userPart);
      setDirty(false);
    }
  }, [selectedTemplate, userPart]);
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
    setSaving(true);
    const fullTemplate = hasSeparator
      ? `${systemPart}\n---\n\n${editTemplate}`
      : editTemplate;
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
    hasSeparator,
    systemPart,
    editTemplate,
    loadTemplates,
  ]);

  // ===== Select function (with save prompt) =====
  const handleSelect = useCallback(
    (functionKey: string) => {
      if (functionKey === selectedFunctionKey) return;

      const doSwitch = () => {
        setSelectedFunctionKey(functionKey);
        // Select the system default or first custom for this functionKey
        const entry = templateIndex.get(functionKey);
        if (entry) {
          const first =
            entry.customs.length > 0 ? entry.customs[0] : entry.system;
          setSelectedId(first?.id ?? null);
        } else {
          setSelectedId(null);
        }
      };

      if (dirty) {
        Modal.confirm({
          title: "未保存的修改",
          content: "当前模板有未保存的修改，是否先保存？",
          okText: "保存并切换",
          cancelText: "不保存",
          onOk: async () => {
            const saved = await handleSave();
            doSwitch();
            if (saved) showSuccess("已保存并切换");
          },
          onCancel: () => {
            doSwitch();
          },
        });
      } else {
        doSwitch();
      }
    },
    [selectedFunctionKey, dirty, templateIndex, handleSave],
  );

  // ===== Copy as custom =====
  const handleCopyAsCustom = useCallback(async () => {
    if (!selectedTemplate) return;
    setSaving(true);
    const res = await copyAsCustom(selectedTemplate.id, book.id);
    setSaving(false);
    if (res.ok) {
      showSuccess("已复制为自定义模板");
      setSelectedId(res.data.id);
      void loadTemplates();
    } else {
      showError(res.error);
    }
  }, [selectedTemplate, book.id, loadTemplates]);

  // ===== Delete custom template =====
  const handleDelete = useCallback(async () => {
    if (!selectedTemplate || isSystemDefault) return;
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
  const handleEditChange = useCallback((value: string) => {
    setEditTemplate(value);
    setDirty(true);
  }, []);

  // ===== View mode toggle =====
  const handleViewModeChange = useCallback((mode: "editor" | "preview") => {
    setViewMode(mode);
  }, []);

  // ===== Render =====
  return (
    <div className={styles.layoutRoot}>
      <PromptList
        loading={loading}
        selectedFunctionKey={selectedFunctionKey}
        templateIndex={templateIndex}
        expandedGroups={expandedGroups}
        onSelect={handleSelect}
        onToggleGroup={toggleGroup}
      />

      {viewMode === "editor" ? (
        <PromptEditor
          template={selectedTemplate}
          isSystemDefault={isSystemDefault}
          editContent={editTemplate}
          dirty={dirty}
          isActive={selectedTemplate?.isActive ?? false}
          saving={saving}
          showVariables={showVariables}
          viewMode={viewMode}
          onEditChange={handleEditChange}
          onToggleVariables={() => setShowVariables((v) => !v)}
          onSave={() => void handleSave()}
          onDelete={() => void handleDelete()}
          onActivate={() => void handleActivate()}
          onCopyAsCustom={() => void handleCopyAsCustom()}
          onViewModeChange={handleViewModeChange}
        />
      ) : (
        <PromptPreview
          template={selectedTemplate}
          editContent={editTemplate}
          hasSeparator={hasSeparator}
          systemPart={systemPart}
          book={book}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
        />
      )}
    </div>
  );
}
