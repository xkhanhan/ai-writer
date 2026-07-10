"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Button,
  Input,
  Tag,
  Tooltip,
  Spin,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  DownOutlined,
  InfoCircleOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import {
  PanelContainer,
  PanelGroup,
  Panel,
  Divider,
} from "@/shared/ui/panel-container";
import BaseModal from "@/shared/ui/base-modal";
import { AiSceneModal } from "@/shared/ui/ai-scene-modal";
import { getWorldRuleScenes } from "../../config/ai-scenes";
import { EmptyState } from "@/shared/ui/empty-state";
import { confirmDelete } from "@/shared/ui/confirm-delete";
import type {
  Book,
  WorldRule,
  WorldRuleCategory,
  CreateWorldRuleDTO,
} from "@/app/types";
import {
  fetchWorldRules,
  createWorldRule,
  updateWorldRule,
  deleteWorldRule,
} from "../../api/world-rules";
import { showError, showSuccess } from "@/app/utils/error-handler";
import styles from "./index.module.css";

// ============ 常量 ============

const CATEGORY_META: Record<
  WorldRuleCategory,
  { label: string; limit: number | null; tagColor: string }
> = {
  global: { label: "全局规则", limit: 20, tagColor: "green" },
  writing: { label: "写作规则", limit: 20, tagColor: "blue" },
  setting: { label: "设定规则", limit: null, tagColor: "orange" },
};

const SETTING_TYPE_LABELS: Record<string, string> = {
  text: "文本",
  select: "下拉选项",
  number: "数字范围",
};

const SETTING_TYPE_COLORS: Record<string, string> = {
  text: "green",
  select: "blue",
  number: "orange",
};

// ============ 组件 ============

interface WorldRulesProps {
  book: Book;
  activeId?: string;
  onActiveChange?: (id: string) => void;
}

export default function WorldRules({ book, activeId, onActiveChange }: WorldRulesProps) {
  // 数据
  const [rules, setRules] = useState<WorldRule[]>([]);
  const [loading, setLoading] = useState(true);

  // 分组折叠状态
  const [collapsed, setCollapsed] = useState<Record<WorldRuleCategory, boolean>>({
    global: false,
    writing: false,
    setting: false,
  });

  // Modal 状态
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [modalCategory, setModalCategory] = useState<WorldRuleCategory>("global");
  const [editingRule, setEditingRule] = useState<WorldRule | null>(null);

  // 表单字段
  const [formName, setFormName] = useState("");
  const [formContent, setFormContent] = useState("");

  // AI 建议弹窗
  const [aiOpen, setAiOpen] = useState(false);

  const activeRule = rules.find((r) => r.id === activeId) ?? null;

  // 按分类分组
  const grouped = {
    global: rules.filter((r) => r.category === "global"),
    writing: rules.filter((r) => r.category === "writing"),
    setting: rules.filter((r) => r.category === "setting"),
  };

  // ============ 数据加载 ============

  const loadRules = useCallback(async () => {
    setLoading(true);
    const result = await fetchWorldRules(book.id);
    if (result.ok) {
      setRules(result.data);
    }
    setLoading(false);
  }, [book.id]);

  useEffect(() => {
    void (async () => {
      await loadRules();
    })();
  }, [loadRules]);

  // 数据加载完成后，自动选中首项（无历史选中 or 选中项已被删除）
  useEffect(() => {
    if (loading || rules.length === 0) return;
    if (!activeId || !rules.some((r) => r.id === activeId)) {
      onActiveChange?.(rules[0].id);
    }
  }, [loading, rules, activeId, onActiveChange]);

  // ============ 表单操作 ============

  const resetForm = () => {
    setFormName("");
    setFormContent("");
  };

  const openCreate = (category: WorldRuleCategory) => {
    resetForm();
    setModalMode("create");
    setModalCategory(category);
    setEditingRule(null);
    setModalOpen(true);
  };

  const openEdit = (rule: WorldRule) => {
    setFormName(rule.name);
    setFormContent(rule.content);
    setModalMode("edit");
    setModalCategory(rule.category);
    setEditingRule(rule);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;

    if (modalMode === "create") {
      const dto: CreateWorldRuleDTO = {
        category: modalCategory,
        name: formName.trim(),
        content: formContent,
      };

      const result = await createWorldRule(book.id, dto);
      if (!result.ok) {
        showError(result.error || "创建失败");
        return;
      }
      setRules((prev) => [...prev, result.data]);
      onActiveChange?.(result.data.id);
    } else if (editingRule) {
      const result = await updateWorldRule(editingRule.id, {
        name: formName.trim(),
        content: formContent,
      });
      if (result.ok) {
        setRules((prev) => prev.map((r) => (r.id === result.data.id ? result.data : r)));
      } else {
        showError(result.error || "保存失败");
        return;
      }
    }

    showSuccess(modalMode === "create" ? "创建成功" : "保存成功");
    setModalOpen(false);
    resetForm();
  };

  const handleDelete = (rule: WorldRule) => {
    if (rule.isFixed) return;
    confirmDelete(rule.name, async () => {
      const result = await deleteWorldRule(rule.id);
      if (result.ok) {
        setRules((prev) => prev.filter((r) => r.id !== rule.id));
        showSuccess("删除成功");
      } else {
        showError(result.error || "删除失败");
      }
    });
  };

  const toggleCategory = (cat: WorldRuleCategory) => {
    setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const handleAiSave = async (rulesByCategory: Record<string, { name: string; content: string }[]>) => {
    const cats: WorldRuleCategory[] = ["global", "writing", "setting"];
    let savedCount = 0;
    for (const cat of cats) {
      const rules = rulesByCategory[cat];
      if (!Array.isArray(rules)) continue;
      for (const rule of rules) {
        const result = await createWorldRule(book.id, {
          category: cat,
          name: rule.name,
          content: rule.content,
        });
        if (result.ok) savedCount++;
      }
    }
    if (savedCount === 0) throw new Error("未成功保存任何规则");
  };

  // ============ 左侧面板 ============

  const renderCategoryGroup = (category: WorldRuleCategory) => {
    const meta = CATEGORY_META[category];
    const items = grouped[category];
    const isCollapsed = collapsed[category];
    const count =
      meta.limit !== null ? `${items.length}/${meta.limit}` : `${items.length}`;

    return (
      <div key={category} className={styles.categoryGroup}>
        <div className={styles.categoryHeader} onClick={() => toggleCategory(category)}>
          <DownOutlined
            className={`${styles.collapseIcon} ${isCollapsed ? styles.collapsed : ""}`}
            style={{ fontSize: 10 }}
          />
          <span className={styles.categoryLabel}>{meta.label}</span>
          <span className={styles.categoryCount}>{count}</span>
          <Tooltip title={`新建${meta.label}`}>
            <Button
              type="text"
              size="small"
              icon={<PlusOutlined />}
              className={styles.categoryAddBtn}
              onClick={(e) => {
                e.stopPropagation();
                openCreate(category);
              }}
            />
          </Tooltip>
        </div>
        {!isCollapsed && (
          <div className={styles.categoryItems}>
            {items.map((rule) => (
              <div
                key={rule.id}
                className={`${styles.ruleItem} ${
                  activeId === rule.id ? styles.ruleItemActive : ""
                }`}
                onClick={() =>
                  onActiveChange?.(rule.id === activeId ? "" : rule.id)
                }
              >
                <span className={styles.ruleName}>{rule.name}</span>
                <div className={styles.ruleItemMeta}>
                  {rule.isFixed && (
                    <Tag color="red" style={{ margin: 0, fontSize: 10 }}>
                      固定
                    </Tag>
                  )}
                  {category === "setting" && rule.settingType && (
                    <Tag
                      color={SETTING_TYPE_COLORS[rule.settingType]}
                      style={{ margin: 0 }}
                    >
                      {SETTING_TYPE_LABELS[rule.settingType]}
                    </Tag>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const totalRules = rules.length;

  const leftPanelContent = loading ? (
    <div className={styles.leftEmpty}>
      <Spin />
    </div>
  ) : rules.length === 0 ? (
    <div className={styles.leftEmpty}>
      <EmptyState
        icon={<InfoCircleOutlined />}
        title="还没有世界规则"
        description="定义你的世界观规则，辅助 AI 生成"
        action={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openCreate("global")}
          >
            新建规则
          </Button>
        }
      />
    </div>
  ) : (
    <div className={styles.ruleList}>
      <div className={styles.listToolbar}>
        <span className={styles.ruleCount}>{totalRules} 条规则</span>
        <Button
          type="primary"
          size="small"
          icon={<ThunderboltOutlined />}
          onClick={() => setAiOpen(true)}
        >
          AI 建议
        </Button>
      </div>
      {(["global", "writing", "setting"] as WorldRuleCategory[]).map(
        renderCategoryGroup
      )}
    </div>
  );

  return (
    <>
      <PanelContainer>
        <PanelGroup direction="horizontal">
          <Panel
            title="世界规则"
            defaultSize={280}
            minSize={200}
            maxSize={500}
            collapsible
            actions={
              <span className={styles.ruleCount}>{totalRules}</span>
            }
          >
            {leftPanelContent}
          </Panel>

          <Divider />

          <Panel
            title={activeRule ? activeRule.name : "世界规则"}
            defaultSize={600}
            minSize={400}
            actions={
              activeRule ? (
                <>
                  <Tag color={CATEGORY_META[activeRule.category].tagColor}>
                    {CATEGORY_META[activeRule.category].label}
                  </Tag>
                  {activeRule.isFixed && (
                    <Tag color="error">固定规则</Tag>
                  )}
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => openEdit(activeRule)}
                  >
                    编辑
                  </Button>
                  {!activeRule.isFixed && (
                    <Button
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleDelete(activeRule)}
                    >
                      删除
                    </Button>
                  )}
                </>
              ) : undefined
            }
          >
            {activeRule ? (
              <div className={styles.detailBody}>
                <span className={styles.detailTime}>
                  更新于{" "}
                  {new Date(activeRule.updatedAt).toLocaleString("zh-CN")}
                </span>

                <div className={styles.detailSection}>
                  <div className={styles.detailSectionLabel}>规则内容</div>
                  <div className={styles.detailSectionContent}>
                    {activeRule.content || <span style={{ color: "var(--text-tertiary)", fontStyle: "italic" }}>暂无内容</span>}
                  </div>
                </div>

                {activeRule.category === "setting" && activeRule.settingType && (
                  <div className={styles.detailSection}>
                    <div className={styles.detailSectionLabel}>设定规则配置</div>
                    <div className={styles.detailSectionContent}>
                      <div className={styles.configRow}>
                        <span className={styles.configLabel}>值类型</span>
                        <Tag color={SETTING_TYPE_COLORS[activeRule.settingType]}>
                          {SETTING_TYPE_LABELS[activeRule.settingType]}
                        </Tag>
                      </div>
                      {activeRule.settingType === "select" &&
                        activeRule.selectOptions.length > 0 && (
                          <div className={styles.configRow}>
                            <span className={styles.configLabel}>可选值</span>
                            <div className={styles.configValue}>
                              {activeRule.selectOptions.map((opt, i) => (
                                <Tag key={i}>{opt}</Tag>
                              ))}
                            </div>
                          </div>
                        )}
                      {activeRule.settingType === "number" && (
                        <div className={styles.configRow}>
                          <span className={styles.configLabel}>取值范围</span>
                          <span className={styles.configValue}>
                            {activeRule.numberMin} ~ {activeRule.numberMax}{" "}
                            {activeRule.numberUnit}
                          </span>
                        </div>
                      )}
                      {activeRule.content && (
                        <div className={styles.configRow}>
                          <span className={styles.configLabel}>校验说明</span>
                          <span className={styles.configValue}>
                            {activeRule.content}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.emptyState}>
                选择一条规则查看详情
              </div>
            )}
          </Panel>
        </PanelGroup>
      </PanelContainer>

      {/* 新建/编辑弹窗 */}
      <BaseModal
        title={
          modalMode === "create"
            ? `新建${CATEGORY_META[modalCategory].label}`
            : `编辑${CATEGORY_META[editingRule?.category ?? "global"].label}`
        }
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          resetForm();
        }}
        onOk={handleSave}
        okButtonProps={{ disabled: !formName.trim() }}
        okText="保存"
        width={560}
        destroyOnClose
      >
        <div className={styles.modalForm}>
          {/* 规则名称 */}
          <div className={styles.formField}>
            <label className={styles.formLabel}>
              <span className={styles.required}>*</span> 规则名称
            </label>
            <Input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="输入规则名称"
              maxLength={60}
              showCount
            />
          </div>

          {/* 规则内容 */}
          <div className={styles.formField}>
            <label className={styles.formLabel}>
              <span className={styles.required}>*</span> 规则内容
            </label>
            <Input.TextArea
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              placeholder="描述这条世界规则的具体内容"
              rows={6}
              maxLength={300}
              showCount
            />
          </div>
        </div>
      </BaseModal>

      {/* AI 建议弹窗 */}
      <AiSceneModal
        open={aiOpen}
        scene={getWorldRuleScenes(book.id, handleAiSave)}
        bookId={book.id}
        onClose={() => setAiOpen(false)}
        onSaved={async () => {
          setAiOpen(false);
          await loadRules();
        }}
        onSave={getWorldRuleScenes(book.id, handleAiSave).onSave}
      />
    </>
  );
}
