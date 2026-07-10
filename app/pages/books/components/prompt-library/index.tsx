"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button, Input } from "antd";
import {
  EditOutlined,
  ThunderboltOutlined,
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
} from "../../api/templates";
import styles from "./index.module.css";

// ============ functionKey 分组定义 ============

interface FunctionGroup {
  key: string;
  label: string;
  functionKeys: { key: string; label: string }[];
}

const FUNCTION_GROUPS: FunctionGroup[] = [
  {
    key: "creation",
    label: "创作区",
    functionKeys: [
      { key: "content_generate", label: "正文生成" },
      { key: "deslop", label: "去AI味" },
      { key: "polish", label: "润色" },
      { key: "expand", label: "扩写" },
    ],
  },
  {
    key: "review",
    label: "过审",
    functionKeys: [
      { key: "review_extract", label: "过审提取" },
    ],
  },
  {
    key: "check",
    label: "检查",
    functionKeys: [
      { key: "character_audit", label: "角色一致性检查" },
      { key: "fact_consistency", label: "事实一致性检查" },
    ],
  },
  {
    key: "suggest",
    label: "AI 建议",
    functionKeys: [
      { key: "book_info_suggest", label: "书籍信息建议" },
      { key: "world_rule_suggest", label: "世界规则建议" },
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
  const [selectedFunctionKey, setSelectedFunctionKey] = useState<string | null>(
    null,
  );
  const [saving, setSaving] = useState(false);

  // 右侧编辑状态
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTemplate, setEditTemplate] = useState("");
  const [dirty, setDirty] = useState(false);

  // 展开的分组
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set(FUNCTION_GROUPS.map((g) => g.key)),
  );

  // 加载数据
  const loadTemplates = useCallback(async () => {
    setLoading(true);
    const res = await fetchTemplates(book.id);
    if (res.ok) {
      setTemplates(res.data);
      // 自动选中第一个模板
      if (!selectedFunctionKey && res.data.length > 0) {
        const first = res.data[0];
        setSelectedFunctionKey(first.functionKey);
        setEditName(first.displayName);
        setEditDescription(first.description);
        setEditTemplate(first.template);
        setDirty(false);
      }
    }
    setLoading(false);
  }, [book.id, selectedFunctionKey]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  // 按 functionKey 建立索引
  const templateMap = useMemo(() => {
    const map = new Map<string, PromptTemplate>();
    for (const t of templates) {
      map.set(t.functionKey, t);
    }
    return map;
  }, [templates]);

  const selectedTemplate = selectedFunctionKey
    ? templateMap.get(selectedFunctionKey)
    : null;

  // 切换分组展开
  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  };

  // 选择模板
  const handleSelectTemplate = (functionKey: string) => {
    if (dirty) {
      // 简单提醒，不做阻断
      void (async () => {
        await handleSave();
      })();
    }
    const t = templateMap.get(functionKey);
    if (t) {
      setSelectedFunctionKey(functionKey);
      setEditName(t.displayName);
      setEditDescription(t.description);
      setEditTemplate(t.template);
      setDirty(false);
    }
  };

  // 编辑内容变化
  const handleNameChange = (value: string) => {
    setEditName(value);
    setDirty(true);
  };
  const handleDescriptionChange = (value: string) => {
    setEditDescription(value);
    setDirty(true);
  };
  const handleTemplateChange = (value: string) => {
    setEditTemplate(value);
    setDirty(true);
  };

  // 保存
  const handleSave = async () => {
    if (!selectedTemplate || !dirty) return;
    setSaving(true);
    const res = await updateTemplate(selectedTemplate.id, {
      displayName: editName,
      description: editDescription,
      template: editTemplate,
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

  // 重置为默认（删除自定义模板，重新加载即可恢复默认）
  const handleReset = async () => {
    if (!selectedTemplate) return;
    if (selectedTemplate.isDefault) {
      showSuccess("当前已是默认模板");
      return;
    }
    setSaving(true);
    const res = await deleteTemplate(selectedTemplate.id);
    setSaving(false);
    if (res.ok) {
      showSuccess("已重置为默认模板");
      setSelectedFunctionKey(null);
      setDirty(false);
      void loadTemplates();
    } else {
      showError(res.error);
    }
  };

  // 激活模板（同一 functionKey 下仅激活一个）
  const handleActivate = async () => {
    if (!selectedTemplate) return;
    setSaving(true);

    // 先关闭当前所有同 functionKey 的激活状态
    const sameKeyTemplates = templates.filter(
      (t) => t.functionKey === selectedTemplate.functionKey && t.isActive,
    );
    for (const t of sameKeyTemplates) {
      if (t.id !== selectedTemplate.id) {
        await updateTemplate(t.id, { isActive: false });
      }
    }

    // 激活选中模板
    const res = await updateTemplate(selectedTemplate.id, { isActive: true });
    setSaving(false);
    if (res.ok) {
      showSuccess("模板已激活");
      setDirty(false);
      void loadTemplates();
    } else {
      showError(res.error);
    }
  };

  return (
    <>
      <PanelContainer>
        <PanelGroup direction="horizontal">
          {/* 左侧模板列表 */}
          <Panel
            title="提示词库"
            defaultSize={280}
            minSize={200}
            maxSize={500}
            collapsible
            actions={
              <span className={styles.listCount}>
                {templates.length} 个
              </span>
            }
          >
            {loading ? (
              <div className={styles.loadingHint}>加载中...</div>
            ) : (
              <div className={styles.templateList}>
                {FUNCTION_GROUPS.map((group) => {
                  const isExpanded = expandedGroups.has(group.key);
                  return (
                    <div key={group.key} className={styles.templateGroup}>
                      <button
                        className={styles.groupHeader}
                        onClick={() => toggleGroup(group.key)}
                      >
                        <span
                          className={`${styles.groupArrow} ${isExpanded ? styles.groupArrowExpanded : ""}`}
                        >
                          &#9656;
                        </span>
                        <span className={styles.groupLabel}>{group.label}</span>
                        <span className={styles.groupCount}>
                          {group.functionKeys.filter((fk) =>
                            templateMap.has(fk.key),
                          ).length}
                        </span>
                      </button>
                      {isExpanded && (
                        <div className={styles.groupItems}>
                          {group.functionKeys.map((fk) => {
                            const t = templateMap.get(fk.key);
                            if (!t) return null;
                            const isSelected =
                              selectedFunctionKey === fk.key;
                            return (
                              <div
                                key={fk.key}
                                className={`${styles.templateItem} ${isSelected ? styles.templateItemActive : ""}`}
                                onClick={() =>
                                  handleSelectTemplate(fk.key)
                                }
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    handleSelectTemplate(fk.key);
                                  }
                                }}
                              >
                                <span className={styles.templateItemName}>
                                  {t.displayName}
                                </span>
                                <span className={styles.templateItemBadges}>
                                  {t.isDefault && (
                                    <span className={styles.badgeDefault}>
                                      默认
                                    </span>
                                  )}
                                  {t.isActive && (
                                    <span className={styles.badgeActive}>
                                      激活
                                    </span>
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

          {/* 右侧模板编辑器 */}
          <Panel
            title={
              selectedTemplate
                ? `${selectedTemplate.displayName}`
                : "模板详情"
            }
            defaultSize={600}
            minSize={400}
            actions={
              selectedTemplate ? (
                <span className={styles.headerBadges}>
                  {selectedTemplate.isDefault && (
                    <span className={styles.badgeDefault}>默认</span>
                  )}
                  {selectedTemplate.isActive && (
                    <span className={styles.badgeActive}>激活</span>
                  )}
                </span>
              ) : undefined
            }
          >
            {selectedTemplate ? (
              <div className={styles.editorBody}>
                {/* 基本信息 */}
                <div className={styles.editorSection}>
                  <div className={styles.fieldRow}>
                    <label className={styles.fieldLabel}>模板名称</label>
                    <Input
                      value={editName}
                      onChange={(e) => handleNameChange(e.target.value)}
                      size="small"
                      disabled={selectedTemplate.isDefault}
                    />
                  </div>
                  <div className={styles.fieldRow}>
                    <label className={styles.fieldLabel}>描述</label>
                    <Input
                      value={editDescription}
                      onChange={(e) => handleDescriptionChange(e.target.value)}
                      size="small"
                      disabled={selectedTemplate.isDefault}
                    />
                  </div>
                </div>

                {/* 可用变量 */}
                {selectedTemplate.variables.length > 0 && (
                  <div className={styles.editorSection}>
                    <div className={styles.sectionTitle}>可用变量</div>
                    <div className={styles.variableList}>
                      {selectedTemplate.variables.map((v) => (
                        <div key={v.name} className={styles.variableItem}>
                          <code className={styles.variableName}>
                            ${v.name}
                          </code>
                          <span className={styles.variableArrow}>&rarr;</span>
                          <span className={styles.variableDesc}>
                            {v.description}
                          </span>
                          {v.source && (
                            <span className={styles.variableSource}>
                              ({v.source})
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 模板内容 */}
                <div className={styles.editorSection}>
                  <div className={styles.sectionTitle}>模板内容</div>
                  <textarea
                    className={styles.templateTextarea}
                    value={editTemplate}
                    onChange={(e) => handleTemplateChange(e.target.value)}
                    disabled={selectedTemplate.isDefault}
                    spellCheck={false}
                  />
                </div>

                {/* 底部操作栏 */}
                <div className={styles.editorFooter}>
                  <div className={styles.footerLeft}>
                    <Button
                      onClick={handleReset}
                      disabled={selectedTemplate.isDefault || saving}
                      loading={saving}
                    >
                      重置为默认
                    </Button>
                  </div>
                  <div className={styles.footerRight}>
                    <Button
                      type="primary"
                      icon={<ThunderboltOutlined />}
                      onClick={handleActivate}
                      disabled={saving}
                      loading={saving}
                    >
                      激活
                    </Button>
                    <Button
                      type="primary"
                      icon={<EditOutlined />}
                      onClick={handleSave}
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
