"use client";

import React from "react";
import { GlobalOutlined, EditOutlined } from "@ant-design/icons";
import type { PromptTemplate } from "@/app/types";
import styles from "./prompt-list.module.css";

// ============ Panel Group Configuration ============

interface FunctionItem {
  key: string;
  label: string;
}

interface PanelGroup_ {
  panelKey: string;
  label: string;
  functionKeys: FunctionItem[];
}

export const PANEL_GROUPS: PanelGroup_[] = [
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

// ============ Template Index ============

export interface TemplateEntry {
  system: PromptTemplate | null;
  customs: PromptTemplate[];
}

export function buildTemplateIndex(
  templates: PromptTemplate[],
): Map<string, TemplateEntry> {
  const map = new Map<string, TemplateEntry>();
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
}

// ============ Props ============

interface PromptListProps {
  loading: boolean;
  selectedFunctionKey: string | null;
  templateIndex: Map<string, TemplateEntry>;
  expandedGroups: Set<string>;
  onSelect: (functionKey: string) => void;
  onToggleGroup: (panelKey: string) => void;
  onClose?: () => void;
}

// ============ Component ============

const PromptList = React.memo(function PromptList({
  loading,
  selectedFunctionKey,
  templateIndex,
  expandedGroups,
  onSelect,
  onToggleGroup,
  onClose,
}: PromptListProps) {
  return (
    <div className={styles.listPanel}>
      <div className={styles.listHeader}>
        <div className={styles.listHeaderTitle}>AI 功能</div>
        <div className={styles.listHeaderSub}>选择功能编辑提示词</div>
        {onClose && (
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="关闭列表"
          >
            &times;
          </button>
        )}
      </div>
      {loading ? (
        <div className={styles.emptyState}>加载中...</div>
      ) : (
        <div className={styles.listBody}>
          {PANEL_GROUPS.map((group) => {
            const isExpanded = expandedGroups.has(group.panelKey);
            return (
              <div key={group.panelKey} className={styles.group}>
                <button
                  className={styles.groupHeader}
                  onClick={() => onToggleGroup(group.panelKey)}
                  aria-expanded={isExpanded}
                >
                  <span
                    className={`${styles.groupArrow} ${isExpanded ? "" : styles.groupArrowCollapsed}`}
                  >
                    &#9660;
                  </span>
                  {group.label}
                </button>
                {isExpanded &&
                  group.functionKeys.map((fk) => {
                    const entry = templateIndex.get(fk.key);
                    const isActive = selectedFunctionKey === fk.key;

                    // Determine tag: system default or custom
                    const hasCustom = entry && entry.customs.length > 0;
                    const isSystem = entry?.system != null;

                    return (
                      <button
                        key={fk.key}
                        className={`${styles.functionItem} ${isActive ? styles.functionItemActive : ""}`}
                        onClick={() => onSelect(fk.key)}
                      >
                        <span className={styles.functionDot} />
                        {fk.label}
                        {hasCustom && (
                          <span className={styles.tagCustom}>
                            <EditOutlined style={{ fontSize: 8 }} />
                          </span>
                        )}
                        {isSystem && !hasCustom && (
                          <span className={styles.tagDefault}>
                            <GlobalOutlined style={{ fontSize: 8 }} />
                          </span>
                        )}
                      </button>
                    );
                  })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

export default PromptList;
