"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Button, Input, Tag, Tooltip } from "antd";
import {
  EditOutlined,
  ThunderboltOutlined,
  GlobalOutlined,
  BookOutlined,
  CopyOutlined,
  UndoOutlined,
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
  copyGlobalToBook,
  deleteBookOverride,
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
    functionKeys: [
      { key: "book_synopsis_expand", label: "书籍简介扩写" },
    ],
  },
];

// ============ 组件 ============

interface PromptLibraryProps {
  book: Book;
}

export default function PromptLibrary({ book }: PromptLibraryProps) {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFunctionKey, setSelectedFunctionKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Scope: "global" | "book"
  const [scope, setScope] = useState<"global" | "book">("global");

  // Right panel edit state
  const [editTemplate, setEditTemplate] = useState("");
  const [dirty, setDirty] = useState(false);

  // Expanded groups
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set(PANEL_GROUPS.map((g) => g.panelKey)),
  );

  // Variable insertion
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load templates
  const loadTemplates = useCallback(async () => {
    setLoading(true);
    const res = await fetchTemplates(book.id);
    if (res.ok) {
      setTemplates(res.data);
    }
    setLoading(false);
  }, [book.id]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  // Build template maps: global and book-level
  const { globalMap, bookMap } = useMemo(() => {
    const g = new Map<string, PromptTemplate>();
    const b = new Map<string, PromptTemplate>();
    for (const t of templates) {
      if (t.bookId === null) {
        g.set(t.functionKey, t);
      } else {
        b.set(t.functionKey, t);
      }
    }
    return { globalMap: g, bookMap: b };
  }, [templates]);

  // Current template based on scope
  const currentTemplate = useMemo(() => {
    if (!selectedFunctionKey) return null;
    return scope === "book"
      ? bookMap.get(selectedFunctionKey) ?? null
      : globalMap.get(selectedFunctionKey) ?? null;
  }, [selectedFunctionKey, scope, globalMap, bookMap]);

  // When selecting a template, default to book scope if book override exists
  const handleSelectTemplate = useCallback((functionKey: string) => {
    setSelectedFunctionKey(functionKey);
    setDirty(false);
    setScope(bookMap.has(functionKey) ? "book" : "global");
  }, [bookMap]);

  // Template split by "---": system-fixed (read-only) + user-editable
  const [systemPart, userPart] = useMemo(() => {
    if (!currentTemplate) return ["", ""];
    const parts = currentTemplate.template.split("\n---\n");
    if (parts.length === 2) return [parts[0].trim(), parts[1].trim()];
    return ["", currentTemplate.template];
  }, [currentTemplate]);

  const hasSeparator = systemPart.length > 0;

  // Sync edit template when scope or template changes
  useEffect(() => {
    if (currentTemplate) {
      const parts = currentTemplate.template.split("\n---\n");
      setEditTemplate(parts.length === 2 ? parts[1].trim() : currentTemplate.template);
      setDirty(false);
    }
  }, [currentTemplate]);

  // Toggle group expand
  const toggleGroup = (panelKey: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(panelKey)) next.delete(panelKey);
      else next.add(panelKey);
      return next;
    });
  };

  // Save: rejoin system + user parts
  const handleSave = async () => {
    if (!currentTemplate || !dirty) return;
    setSaving(true);
    const fullTemplate = hasSeparator
      ? `${systemPart}\n---\n\n${editTemplate}`
      : editTemplate;
    const res = await updateTemplate(currentTemplate.id, {
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

  // Copy global to book (create book-level override)
  const handleCopyToBook = async () => {
    if (!selectedFunctionKey) return;
    setSaving(true);
    const res = await copyGlobalToBook(book.id, selectedFunctionKey);
    setSaving(false);
    if (res.ok) {
      showSuccess("已为本书创建定制模板");
      setScope("book");
      void loadTemplates();
    } else {
      showError(res.error);
    }
  };

  // Delete book override (revert to global)
  const handleRevertToGlobal = async () => {
    if (!selectedFunctionKey) return;
    setSaving(true);
    const res = await deleteBookOverride(book.id, selectedFunctionKey);
    setSaving(false);
    if (res.ok) {
      showSuccess("已恢复为全局模板");
      setScope("global");
      void loadTemplates();
    } else {
      showError(res.error);
    }
  };

  // Activate template
  const handleActivate = async () => {
    if (!currentTemplate) return;
    setSaving(true);
    // Deactivate all other templates for this functionKey
    const allForFunction = templates.filter(
      (t) => t.functionKey === currentTemplate.functionKey && t.isActive,
    );
    for (const t of allForFunction) {
      if (t.id !== currentTemplate.id) {
        await updateTemplate(t.id, { isActive: false });
      }
    }
    const res = await updateTemplate(currentTemplate.id, { isActive: true });
    setSaving(false);
    if (res.ok) {
      showSuccess("模板已激活");
      setDirty(false);
      void loadTemplates();
    } else {
      showError(res.error);
    }
  };

  // Insert variable at cursor position
  const handleInsertVariable = (varName: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = editTemplate.slice(0, start);
    const after = editTemplate.slice(end);
    const newText = `${before}$${varName}${after}`;
    setEditTemplate(newText);
    setDirty(true);
    // Restore cursor position after the inserted variable
    setTimeout(() => {
      textarea.focus();
      const pos = start + varName.length + 1;
      textarea.setSelectionRange(pos, pos);
    }, 0);
  };

  const isActive = currentTemplate?.isActive ?? false;
  const isBookScope = scope === "book" && bookMap.has(selectedFunctionKey ?? "");
  const canEdit = currentTemplate && (currentTemplate.isDefault || isBookScope);

  return (
    <>
      <PanelContainer>
        <PanelGroup direction="horizontal">
          {/* Left: template list grouped by panel */}
          <Panel
            title="提示词库"
            defaultSize={280}
            minSize={200}
            maxSize={500}
            collapsible
            actions={
              <span className={styles.listCount}>
                {globalMap.size} 个模板
              </span>
            }
          >
            {loading ? (
              <div className={styles.loadingHint}>加载中...</div>
            ) : (
              <div className={styles.templateList}>
                {PANEL_GROUPS.map((group) => {
                  const isExpanded = expandedGroups.has(group.panelKey);
                  const matchedCount = group.functionKeys.filter(
                    (fk) => globalMap.has(fk.key),
                  ).length;
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
                        <span className={styles.groupCount}>{matchedCount}</span>
                      </button>
                      {isExpanded && (
                        <div className={styles.groupItems}>
                          {group.functionKeys.map((fk) => {
                            const hasBook = bookMap.has(fk.key);
                            const isSelected = selectedFunctionKey === fk.key;
                            return (
                              <div
                                key={fk.key}
                                className={`${styles.templateItem} ${isSelected ? styles.templateItemActive : ""}`}
                                onClick={() => handleSelectTemplate(fk.key)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    handleSelectTemplate(fk.key);
                                  }
                                }}
                              >
                                <span className={styles.templateItemName}>{fk.label}</span>
                                <span className={styles.templateItemBadges}>
                                  {hasBook && (
                                    <Tooltip title="本书已定制">
                                      <BookOutlined style={{ fontSize: 11, color: "var(--color-primary)" }} />
                                    </Tooltip>
                                  )}
                                </span>
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

          {/* Right: template editor */}
          <Panel
            title={currentTemplate ? currentTemplate.displayName : "模板详情"}
            defaultSize={600}
            minSize={400}
            actions={
              currentTemplate ? (
                <span className={styles.headerBadges}>
                  <Tag icon={scope === "global" ? <GlobalOutlined /> : <BookOutlined />} color={scope === "global" ? "default" : "blue"}>
                    {scope === "global" ? "全局" : "本书定制"}
                  </Tag>
                  {isActive && <span className={styles.badgeActive}>激活</span>}
                </span>
              ) : undefined
            }
          >
            {currentTemplate ? (
              <div className={styles.editorBody}>
                {/* Description */}
                {currentTemplate.description && (
                  <div className={styles.description}>{currentTemplate.description}</div>
                )}

                {/* Scope switcher */}
                <div className={styles.scopeBar}>
                  <Button
                    size="small"
                    type={scope === "global" ? "primary" : "default"}
                    icon={<GlobalOutlined />}
                    onClick={() => setScope("global")}
                  >
                    全局模板
                  </Button>
                  <Button
                    size="small"
                    type={scope === "book" ? "primary" : "default"}
                    icon={<BookOutlined />}
                    disabled={!bookMap.has(selectedFunctionKey ?? "")}
                    onClick={() => setScope("book")}
                  >
                    本书定制
                  </Button>
                  <span className={styles.scopeHint}>
                    {scope === "global"
                      ? "全局模板适用于所有书籍"
                      : "当前使用本书专属模板"}
                  </span>
                </div>

                {/* Scope actions */}
                {scope === "global" && !bookMap.has(selectedFunctionKey ?? "") && (
                  <Button
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() => void handleCopyToBook()}
                    loading={saving}
                  >
                    为本书定制
                  </Button>
                )}
                {scope === "book" && (
                  <Button
                    size="small"
                    icon={<UndoOutlined />}
                    onClick={() => void handleRevertToGlobal()}
                    loading={saving}
                  >
                    恢复为全局模板
                  </Button>
                )}

                {/* Variables */}
                {currentTemplate.variables.length > 0 && (
                  <div className={styles.editorSection}>
                    <div className={styles.sectionTitle}>可用变量（点击插入）</div>
                    <div className={styles.variableList}>
                      {currentTemplate.variables.map((v) => (
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

                {/* Template content */}
                <div className={styles.editorSection}>
                  {hasSeparator && (
                    <>
                      <div className={styles.sectionTitle}>系统指令（只读）</div>
                      <pre className={styles.systemPart}>{systemPart}</pre>
                      <div className={styles.separatorHint}>— 以下内容可编辑 —</div>
                    </>
                  )}
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

                {/* Footer */}
                <div className={styles.editorFooter}>
                  <div className={styles.footerLeft} />
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
                      icon={<EditOutlined />}
                      onClick={() => void handleSave()}
                      disabled={!dirty || saving}
                      loading={saving}
                    >
                      保存
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className={styles.emptyDetail}>
                <EmptyState
                  icon={<EditOutlined />}
                  title="选择一个模板进行编辑"
                  description="从左侧列表中选择要查看或编辑的提示词模板"
                />
              </div>
            )}
          </Panel>
        </PanelGroup>
      </PanelContainer>
    </>
  );
}
