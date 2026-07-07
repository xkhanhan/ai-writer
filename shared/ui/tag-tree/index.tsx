"use client";

import React from "react";
import { Tree, ConfigProvider } from "antd";
import type { DataNode } from "antd/es/tree";
import { EditOutlined, PlusOutlined } from "@ant-design/icons";
import type { TagCategory } from "@/shared/types";
import styles from "./index.module.css";

// ============ ConfigProvider Token ============

const treeTheme = {
  components: {
    Tree: {
      controlHeightSM: 36,
      indentSize: 24,
      colorBgContainer: "var(--bg-elevated)",
      colorBgTreeNodeHover: "var(--bg-muted)",
      colorBgTreeNodeSelected: "var(--color-primary-bg)",
      colorTreeExpandIconToggle: "var(--text-tertiary)",
      colorLine: "var(--border-light)",
    },
  },
};

// ============ 类型 ============

export interface TagTreeProps {
  /** 标签树数据 */
  tags: TagCategory[];
  /** 当前展开的节点 key */
  expandedKeys: string[];
  /** 展开回调 */
  onExpand: (keys: string[]) => void;
  /** 当前选中的节点 key */
  selectedKey?: string | null;
  /** 选中回调（点击节点名称） */
  onSelect?: (tag: TagCategory) => void;
  /** 编辑回调（点击编辑按钮） */
  onEdit?: (tag: TagCategory) => void;
  /** 添加子节点回调（点击 + 按钮） */
  onAddChild?: (parentId: string) => void;
  /** 搜索匹配的节点 ID 集合（null 表示无搜索） */
  matchedIds?: Set<string> | null;
  /** 是否显示操作按钮 */
  showActions?: boolean;
  className?: string;
}

// ============ 树数据转换 ============

function toTreeData(
  tags: TagCategory[],
  matchedIds: Set<string> | null,
  callbacks: {
    onEdit?: (tag: TagCategory) => void;
    onAddChild?: (parentId: string) => void;
    showActions: boolean;
  }
): DataNode[] {
  return tags.map((tag) => {
    const hasChildren = tag.children && tag.children.length > 0;
    const isMatched = matchedIds?.has(tag.id) ?? false;
    const hasDesc = !!tag.description;

    return {
      key: tag.id,
      isLeaf: !hasChildren,
      children: hasChildren
        ? toTreeData(tag.children!, matchedIds, callbacks)
        : undefined,
      title: (
        <div className={styles.nodeWrap}>
          {/* 名称 + 描述 */}
          <div
            className={`${styles.nodeText} ${!hasDesc ? styles.nodeTextSingle : ""}`}
          >
            <span
              className={`${styles.nodeName} ${isMatched ? styles.nodeMatched : ""}`}
            >
              {tag.name}
            </span>
            {hasDesc && (
              <span className={styles.nodeDesc}>{tag.description}</span>
            )}
          </div>

          {/* 操作按钮（hover 显示） */}
          {callbacks.showActions && (
            <div className={styles.nodeActions}>
              {callbacks.onAddChild && (
                <span
                  className={styles.nodeAction}
                  title="添加子标签"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    callbacks.onAddChild!(tag.id);
                  }}
                >
                  <PlusOutlined />
                </span>
              )}
              {callbacks.onEdit && (
                <span
                  className={styles.nodeAction}
                  title="编辑"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    callbacks.onEdit!(tag);
                  }}
                >
                  <EditOutlined />
                </span>
              )}
            </div>
          )}
        </div>
      ),
    };
  });
}

// ============ 组件 ============

export function TagTree({
  tags,
  expandedKeys,
  onExpand,
  selectedKey,
  onSelect,
  onEdit,
  onAddChild,
  matchedIds = null,
  showActions = true,
  className,
}: TagTreeProps) {
  const treeData = React.useMemo(
    () => toTreeData(tags, matchedIds, { onEdit, onAddChild, showActions }),
    [tags, matchedIds, onEdit, onAddChild, showActions]
  );

  const handleSelect = React.useCallback(
    (keys: React.Key[]) => {
      if (keys.length > 0 && onSelect) {
        const id = keys[0] as string;
        const tag = findTagById(tags, id);
        if (tag) onSelect(tag);
      }
    },
    [tags, onSelect]
  );

  const handleExpand = React.useCallback(
    (keys: React.Key[]) => {
      onExpand(keys as string[]);
    },
    [onExpand]
  );

  return (
    <ConfigProvider theme={treeTheme}>
      <Tree
        treeData={treeData}
        className={className}
        expandedKeys={expandedKeys}
        onExpand={handleExpand}
        selectedKeys={selectedKey ? [selectedKey] : []}
        onSelect={handleSelect}
        showLine={{ showLeafIcon: false }}
        blockNode
      />
    </ConfigProvider>
  );
}

// ============ 工具 ============

function findTagById(tags: TagCategory[], id: string): TagCategory | null {
  for (const tag of tags) {
    if (tag.id === id) return tag;
    if (tag.children) {
      const found = findTagById(tag.children, id);
      if (found) return found;
    }
  }
  return null;
}
