"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Button, Tag, Tooltip, Select } from "antd";
import {
  EditOutlined,
  ThunderboltOutlined,
  GlobalOutlined,
  BookOutlined,
  CopyOutlined,
  DeleteOutlined,
  CheckOutlined,
} from "@ant-design/icons";
import {
  PanelContainer,
  PanelGroup,
  Panel,
  Divider,
} from "@/shared/ui/panel-container";
import { EmptyState } from "@/shared/ui/empty-state";
import { showError, showSuccess } from "@/app/utils/error-handler";
import type { Book, PromptTemplate } from "@/app/types";
import {
  fetchTemplates,
  updateTemplate,
  deleteTemplate,
  copyAsCustom,
  activateTemplateById,
} from "../../api/templates";
import styles from "./index.module.css";

// ============ 按 Workspace 面板分组 ============

interface PanelGroup_ {
  panelKey: string;
  label: string;
  functionKeys: { key: string; label: string }[];
}

const PANEL_GROUPS: PanelGroup_[] = [
  {
    panelKey: "info",
    label: "书籍信息",
    functionKeys: [{ key: "book_info_suggest", label: "书籍信息建议" }],
  },
  {
    panelKey: "world-rules",
    label: "世界规则",
    functionKeys: [{ key: "world_rule_suggest", label: "世界规则建议" }],
  },
  {
    panelKey: "creation",
    label: "创作区",
    functionKeys: [
      { key: "content_generate", label: "正文生成" },
      { key: "review_extract", label: "过审提取" },
      { key: "polish", label: "润色" },
      { key: "deslop", label: "去AI味" },
      { key: "expand", label: "扩写" },
    ],
  },
  {
    panelKey: "fact-library",
    label: "事实库",
    functionKeys: [{ key: "fact_consistency", label: "事实一致性检查" }],
  },
  {
    panelKey: "settings",
    label: "设定库",
    functionKeys: [{ key: "character_audit", label: "角色一致性检查" }],
  },
  {
    panelKey: "archive",
    label: "正文库",
    functionKeys: [{ key: "book_synopsis_expand", label: "书籍简介扩写" }],
  },
];

// ============ 组件 ============

interface PromptLibraryProps {
  book: Book;
}

export default function PromptLibrary({ book }: PromptLibraryProps) {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Edit state
  const [editTemplate, setEditTemplate] = useState("");
  const [dirty, setDirty] = useState(false);

  // Expanded groups
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set(PANEL_GROUPS.map((g) => g.panelKey)),
  );

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load all templates (system defaults + book-specific)
  const loadTemplates = useCallback(async () => {
    setLoading(true);
    const res = await fetchTemplates(book.id);
    if (res.ok) setTemplates(res.data);
    setLoading(false);
  }, [book.id]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- async load is safe
  useEffect(() => { void loadTemplates(); }, [loadTemplates]);

  // Build index: for each functionKey, find system default and any custom copies
  const templateIndex = useMemo(() => {
    const map = new Map<string, { system: PromptTemplate | null; customs: PromptTemplate[] }>();
    for (const t of templates) {
      const key = t.functionKey;
      if (!map.has(key)) map.set(key, { system: null, customs: [] });
      const entry = map.get(key)!;
      if (t.isDefault && t.bookId === null) {
        entry.system = t;
      } else {
        entry.customs.push(t);
      }
    }
    return map;
  }, [templates]);

  // Current selected template
  const selectedTemplate = useMemo(() => {
    if (!selectedId) return null;
    return templates.find((t) => t.id === selectedId) ?? null;
  }, [selectedId, templates]);

  // Template split by "---"
  const [systemPart] = useMemo(() => {
    if (!selectedTemplate) return ["", ""];
    const parts = selectedTemplate.template.split("\n---\n");
    if (parts.length === 2) return [parts[0].trim(), parts[1].trim()];
    return ["", selectedTemplate.template];
  }, [selectedTemplate]);

  const hasSeparator = systemPart.length > 0;
  const isSystemDefault = selectedTemplate?.isDefault === true && selectedTemplate?.bookId === null;

  // Sync edit template when selection changes
  /* eslint-disable react-hooks/set-state-in-effect -- resetting local edit state on selection change */
  useEffect(() => {
    if (selectedTemplate) {
      const parts = selectedTemplate.template.split("\n---\n");
      setEditTemplate(parts.length === 2 ? parts[1].trim() : selectedTemplate.template);
      setDirty(false);
    }
  }, [selectedTemplate]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Toggle group
  const toggleGroup = (panelKey: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(panelKey)) next.delete(panelKey);
      else next.add(panelKey);
      return next;
    });
  };

  // Select template
  const handleSelect = (id: string) => {
    if (dirty) void handleSave();
    setSelectedId(id);
  };

  // Copy system default as custom
  const handleCopyAsCustom = async (sourceId: string) => {
    setSaving(true);
    const res = await copyAsCustom(sourceId, book.id);
    setSaving(false);
    if (res.ok) {
      showSuccess("已复制为自定义模板");
      setSelectedId(res.data.id);
      void loadTemplates();
    } else {
      showError(res.error);
    }
  };

  // Save custom template
  const handleSave = async () => {
    if (!selectedTemplate || !dirty || selectedTemplate.isDefault) return;
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
    } else {
      showError(res.error);
    }
  };

  // Delete custom template
  const handleDelete = async () => {
    if (!selectedTemplate || selectedTemplate.isDefault) return;
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
  };

  // Activate template (atomic: server deactivates all others in one transaction)
  const handleActivate = async () => {
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
  };

  // Insert variable at cursor
  const handleInsertVariable = (varName: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = editTemplate.slice(0, start);
    const after = editTemplate.slice(end);
    setEditTemplate(`${before}$${varName}${after}`);
    setDirty(true);
    setTimeout(() => {
      textarea.focus();
      const pos = start + varName.length + 1;
      textarea.setSelectionRange(pos, pos);
    }, 0);
  };

  const isActive = selectedTemplate?.isActive ?? false;

  return (
    <>
      <PanelContainer>
        <PanelGroup direction="horizontal">
          {/* Left: template list */}
          <Panel
            title="提示词库"
            defaultSize={280}
            minSize={200}
            maxSize={500}
            collapsible
          >
            {loading ? (
              <div className={styles.loadingHint}>加载中...</div>
            ) : (
              <div className={styles.templateList}>
                {PANEL_GROUPS.map((group) => {
                  const isExpanded = expandedGroups.has(group.panelKey);
                  return (
                    <div key={group.panelKey} className={styles.templateGroup}>
                      <button
                        className={styles.groupHeader}
                        onClick={() => toggleGroup(group.panelKey)}
                      >
                        <span className={`${styles.groupArrow} ${isExpanded ? styles.groupArrowExpanded : ""}`}>
                          &#9656;
                        </span>
                        <span className={styles.groupLabel}>{group.label}</span>
                      </button>
                      {isExpanded && (
                        <div className={styles.groupItems}>
                          {group.functionKeys.map((fk) => {
                            const entry = templateIndex.get(fk.key);
                            if (!entry) return null;
                            return (
                              <div key={fk.key}>
                                {/* System default */}
                                {entry.system && (
                                  <div
                                    className={`${styles.templateItem} ${selectedId === entry.system.id ? styles.templateItemActive : ""}`}
                                    onClick={() => handleSelect(entry.system!.id)}
                                    role="button"
                                    tabIndex={0}
                                  >
                                    <span className={styles.templateItemName}>{fk.label}</span>
                                    <span className={styles.templateItemBadges}>
                                      {entry.system.isActive && (
                                        <span className={styles.badgeActive}>激活</span>
                                      )}
                                      <Tooltip title="系统默认模板">
                                        <GlobalOutlined style={{ fontSize: 11, color: "var(--text-tertiary)" }} />
                                      </Tooltip>
                                    </span>
                                  </div>
                                )}
                                {/* Custom copies */}
                                {entry.customs.map((c) => (
                                  <div
                                    key={c.id}
                                    className={`${styles.templateItem} ${styles.templateItemCustom} ${selectedId === c.id ? styles.templateItemActive : ""}`}
                                    onClick={() => handleSelect(c.id)}
                                    role="button"
                                    tabIndex={0}
                                  >
                                    <span className={styles.templateItemName}>
                                      {c.displayName || fk.label}
                                    </span>
                                    <span className={styles.templateItemBadges}>
                                      {c.isActive && (
                                        <span className={styles.badgeActive}>激活</span>
                                      )}
                                      <Tooltip title={c.bookId ? "本书定制" : "自定义全局"}>
                                        {c.bookId ? (
                                          <BookOutlined style={{ fontSize: 11, color: "var(--color-primary)" }} />
                                        ) : (
                                          <EditOutlined style={{ fontSize: 11, color: "var(--color-primary)" }} />
                                        )}
                                      </Tooltip>
                                    </span>
                                  </div>
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          <Divider />

          {/* Right: template detail / editor */}
          <Panel
            title={selectedTemplate ? selectedTemplate.displayName : "模板详情"}
            defaultSize={600}
            minSize={400}
            actions={
              selectedTemplate ? (
                <span className={styles.headerBadges}>
                  <Tag
                    icon={isSystemDefault ? <GlobalOutlined /> : selectedTemplate?.bookId ? <BookOutlined /> : <EditOutlined />}
                    color={isSystemDefault ? "default" : "blue"}
                  >
                    {isSystemDefault ? "系统默认" : selectedTemplate?.bookId ? "本书定制" : "自定义全局"}
                  </Tag>
                  {isActive && <span className={styles.badgeActive}>激活</span>}
                </span>
              ) : undefined
            }
          >
            {selectedTemplate ? (
              <div className={styles.editorBody}>
                {/* Description */}
                {selectedTemplate.description && (
                  <div className={styles.description}>{selectedTemplate.description}</div>
                )}

                {/* System default: read-only view + copy button */}
                {isSystemDefault && (
                  <div className={styles.systemDefaultActions}>
                    <Button
                      type="primary"
                      icon={<CopyOutlined />}
                      onClick={() => void handleCopyAsCustom(selectedTemplate.id)}
                      loading={saving}
                    >
                      复制为自定义
                    </Button>
                    <Button
                      type={isActive ? "default" : "primary"}
                      icon={<ThunderboltOutlined />}
                      onClick={() => void handleActivate()}
                      disabled={isActive || saving}
                      loading={saving}
                    >
                      {isActive ? "已激活" : "激活"}
                    </Button>
                  </div>
                )}

                {/* System-fixed part (read-only) */}
                {hasSeparator && (
                  <div className={styles.editorSection}>
                    <div className={styles.sectionTitle}>系统指令（不可编辑）</div>
                    <pre className={styles.systemPart}>{systemPart}</pre>
                    <div className={styles.separatorHint}>— 以下内容可编辑 —</div>
                  </div>
                )}

                {/* Variables (for custom templates) */}
                {!isSystemDefault && selectedTemplate.variables.length > 0 && (
                  <div className={styles.editorSection}>
                    <div className={styles.sectionTitle}>可用变量（点击插入）</div>
                    <div className={styles.variableList}>
                      {selectedTemplate.variables.map((v) => (
                        <div
                          key={v.name}
                          className={styles.variableItem}
                          onClick={() => handleInsertVariable(v.name)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleInsertVariable(v.name);
                            }
                          }}
                        >
                          <code className={styles.variableName}>${v.name}</code>
                          <span className={styles.variableArrow}>&rarr;</span>
                          <span className={styles.variableDesc}>{v.description}</span>
                          {v.source && (
                            <span className={styles.variableSource}>({v.source})</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Editable template content */}
                {!isSystemDefault && (
                  <div className={styles.editorSection}>
                    <div className={styles.sectionTitle}>{hasSeparator ? "自定义指令" : "模板内容"}</div>
                    <textarea
                      ref={textareaRef}
                      className={styles.templateTextarea}
                      value={editTemplate}
                      onChange={(e) => {
                        setEditTemplate(e.target.value);
                        setDirty(true);
                      }}
                      spellCheck={false}
                    />
                  </div>
                )}

                {/* System default: show full template as read-only */}
                {isSystemDefault && !hasSeparator && (
                  <div className={styles.editorSection}>
                    <div className={styles.sectionTitle}>完整模板（只读）</div>
                    <pre className={styles.systemPart}>{selectedTemplate.template}</pre>
                  </div>
                )}

                {/* Footer: custom template actions */}
                {!isSystemDefault && (
                  <div className={styles.editorFooter}>
                    <div className={styles.footerLeft}>
                      <Button
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => void handleDelete()}
                        disabled={saving}
                        loading={saving}
                      >
                        删除
                      </Button>
                    </div>
                    <div className={styles.footerRight}>
                      <Button
                        type="primary"
                        icon={<ThunderboltOutlined />}
                        onClick={() => void handleActivate()}
                        disabled={isActive || saving}
                        loading={saving}
                      >
                        激活
                      </Button>
                      <Button
                        type="primary"
                        icon={<CheckOutlined />}
                        onClick={() => void handleSave()}
                        disabled={!dirty || saving}
                        loading={saving}
                      >
                        保存
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.emptyDetail}>
                <EmptyState
                  icon={<EditOutlined />}
                  title="选择一个模板"
                  description="从左侧列表中选择模板查看或编辑"
                />
              </div>
            )}
          </Panel>
        </PanelGroup>
      </PanelContainer>
    </>
  );
}
