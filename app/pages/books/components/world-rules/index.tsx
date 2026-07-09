"use client";

import { useState, useEffect, useCallback } from "react";
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
  LockOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { SplitPanel } from "@/shared/ui/split-panel";
import BaseModal from "@/shared/ui/base-modal";
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

  const leftPanel = loading ? (
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
      </div>
      {(["global", "writing", "setting"] as WorldRuleCategory[]).map(
        renderCategoryGroup
      )}
    </div>
  );

  // ============ 右侧详情面板 ============

  const rightHeader = activeRule ? (
    <div className={styles.detailHeader}>
      <div className={styles.detailTitleRow}>
        <h3 className={styles.detailTitle}>{activeRule.name}</h3>
        <Tag color={CATEGORY_META[activeRule.category].tagColor}>
          {CATEGORY_META[activeRule.category].label}
        </Tag>
        {activeRule.isFixed && (
          <Tag icon={<LockOutlined />} color="error">
            固定规则
          </Tag>
        )}
      </div>
      <span className={styles.detailTime}>
        更新于{" "}
        {new Date(activeRule.updatedAt).toLocaleString("zh-CN")}
      </span>
      <div className={styles.detailActions}>
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
      </div>
    </div>
  ) : null;

  const rightPanel = activeRule ? (
    <div className={styles.detailBody}>
      <div className={styles.contentCard}>
        <div className={styles.contentCardHeader}>
          <span className={styles.contentCardTitle}>规则内容</span>
          <Tag color={CATEGORY_META[activeRule.category].tagColor}>
            {CATEGORY_META[activeRule.category].label}
          </Tag>
        </div>
        <div className={styles.contentCardBody}>
          {activeRule.content ? (
            <p className={styles.detailText}>{activeRule.content}</p>
          ) : (
            <p className={styles.detailEmpty}>暂无内容</p>
          )}
        </div>
      </div>

      {activeRule.category === "setting" && activeRule.settingType && (
        <div className={styles.contentCard}>
          <div className={styles.contentCardHeader}>
            <InfoCircleOutlined />
            <span className={styles.contentCardTitle}>设定规则配置</span>
          </div>
          <div className={styles.contentCardBody}>
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
  ) : null;

  return (
    <>
      <SplitPanel
        left={leftPanel}
        right={rightPanel}
        rightHeader={rightHeader}
        emptyHint="选择一条规则查看详情"
      />

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
    </>
  );
}
