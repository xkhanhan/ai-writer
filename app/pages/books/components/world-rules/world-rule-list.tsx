"use client";

import { Button, Spin, Tag, Tooltip } from "antd";
import {
  InfoCircleOutlined,
  PlusOutlined,
  DownOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { EmptyState } from "@/shared/ui/empty-state";
import type { WorldRule, WorldRuleCategory } from "@/app/types";
import {
  CATEGORY_META,
  SETTING_TYPE_LABELS,
  SETTING_TYPE_COLORS,
} from "./constants";
import styles from "./world-rule-list.module.css";

interface WorldRuleListProps {
  rules: WorldRule[];
  loading: boolean;
  activeId: string | undefined;
  collapsed: Record<WorldRuleCategory, boolean>;
  onToggleCategory: (cat: WorldRuleCategory) => void;
  onSelectRule: (id: string) => void;
  onOpenCreate: (category: WorldRuleCategory) => void;
  onOpenAi: () => void;
}

export default function WorldRuleList({
  rules,
  loading,
  activeId,
  collapsed,
  onToggleCategory,
  onSelectRule,
  onOpenCreate,
  onOpenAi,
}: WorldRuleListProps) {
  const grouped = {
    global: rules.filter((r) => r.category === "global"),
    writing: rules.filter((r) => r.category === "writing"),
    setting: rules.filter((r) => r.category === "setting"),
  };

  const renderCategoryGroup = (category: WorldRuleCategory) => {
    const meta = CATEGORY_META[category];
    const items = grouped[category];
    const isCollapsed = collapsed[category];
    const count =
      meta.limit !== null ? `${items.length}/${meta.limit}` : `${items.length}`;

    return (
      <div key={category} className={styles.categoryGroup}>
        <div
          className={styles.categoryHeader}
          onClick={() => onToggleCategory(category)}
        >
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
                onOpenCreate(category);
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
                onClick={() => onSelectRule(rule.id)}
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

  if (loading) {
    return (
      <div className={styles.empty}>
        <Spin />
      </div>
    );
  }

  if (rules.length === 0) {
    return (
      <div className={styles.empty}>
        <EmptyState
          icon={<InfoCircleOutlined />}
          title="还没有世界规则"
          description="定义你的世界观规则，辅助 AI 生成"
          action={
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => onOpenCreate("global")}
            >
              新建规则
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className={styles.ruleList}>
      <div className={styles.listToolbar}>
        <span className={styles.ruleCount}>{rules.length} 条规则</span>
        <Button
          type="primary"
          size="small"
          icon={<ThunderboltOutlined />}
          onClick={onOpenAi}
        >
          AI 建议
        </Button>
      </div>
      {(["global", "writing", "setting"] as WorldRuleCategory[]).map(
        renderCategoryGroup
      )}
    </div>
  );
}
