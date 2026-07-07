"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { TreeSelect, Spin } from "antd";
import type { TreeSelectProps } from "antd";
import { TagOutlined } from "@ant-design/icons";
import { useTagTree } from "@/app/hooks/use-tag-tree";
import type { TagCategory } from "@/app/types";
import styles from "./index.module.css";

// ============ 类型 ============

interface TagSelectorProps {
  value?: string[];
  onChange?: (value: string[]) => void;
  bookId: string;
  placeholder?: string;
  disabled?: boolean;
  maxTagCount?: number;
}

// ============ 工具函数 ============

/** 将 TagCategory 树转换为 antd TreeSelect 数据节点 */
function toTreeData(tags: TagCategory[]): TreeSelectProps["treeData"] {
  return tags.map((tag) => ({
    value: tag.id,
    title: tag.code ? `${tag.name}（${tag.code}）` : tag.name,
    children: tag.children ? toTreeData(tag.children) : undefined,
    isLeaf: !tag.children || tag.children.length === 0,
  }));
}

/** 收集树中所有节点 ID（用于搜索匹配时展开父节点） */
function collectAllIds(tags: TagCategory[]): Set<string> {
  const ids = new Set<string>();
  const walk = (nodes: TagCategory[]) => {
    for (const n of nodes) {
      ids.add(n.id);
      if (n.children) walk(n.children);
    }
  };
  walk(tags);
  return ids;
}

/** 搜索匹配：在扁平列表中查找匹配的节点 ID 及其所有祖先 ID */
function searchMatch(
  tags: TagCategory[],
  keyword: string
): Set<string> | null {
  if (!keyword.trim()) return null;

  const lower = keyword.toLowerCase();
  const matched = new Set<string>();

  // 扁平化并记录路径
  interface FlatNode {
    node: TagCategory;
    path: string[];
  }
  const flat: FlatNode[] = [];
  const parentIdMap = new Map<string, string | undefined>();

  const walk = (nodes: TagCategory[], path: string[]) => {
    for (const n of nodes) {
      parentIdMap.set(n.id, n.parentId);
      flat.push({ node: n, path: [...path, n.id] });
      if (n.children) walk(n.children, [...path, n.id]);
    }
  };
  walk(tags, []);

  // 匹配名称、编码、描述
  for (const { node, path } of flat) {
    const nameMatch = node.name.toLowerCase().includes(lower);
    const codeMatch = node.code?.toLowerCase().includes(lower);
    const descMatch = node.description?.toLowerCase().includes(lower);

    if (nameMatch || codeMatch || descMatch) {
      // 添加该节点及其所有祖先
      for (const id of path) {
        matched.add(id);
      }
    }
  }

  return matched;
}

// ============ 防抖 Hook ============

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

// ============ 组件 ============

export function TagSelector({
  value = [],
  onChange,
  bookId,
  placeholder = "选择标签",
  disabled = false,
  maxTagCount = 5,
}: TagSelectorProps) {
  const { tags, loading } = useTagTree(bookId);
  const [searchValue, setSearchValue] = useState("");
  const [expandedKeys, setExpandedKeys] = useState<(string | number)[]>([]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 防抖搜索值（300ms）
  const debouncedSearch = useDebounce(searchValue, 300);

  // ============ 树数据预缓存 ============

  const treeData = useMemo(() => toTreeData(tags), [tags]);
  const allNodeIds = useMemo(() => collectAllIds(tags), [tags]);

  // ============ 搜索逻辑 ============

  /** 搜索匹配的节点集合（null 表示无搜索） */
  const matchedIds = useMemo(
    () => (debouncedSearch ? searchMatch(tags, debouncedSearch) : null),
    [tags, debouncedSearch]
  );

  /** 搜索时自动展开匹配节点的父级 */
  const searchExpandedKeys = useMemo(() => {
    if (matchedIds && matchedIds.size > 0) {
      return Array.from(allNodeIds);
    }
    if (!debouncedSearch) {
      return [];
    }
    return expandedKeys;
  }, [matchedIds, debouncedSearch, allNodeIds, expandedKeys]);

  // ============ 搜索输入处理（带防抖） ============

  const handleSearch = useCallback(
    (val: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setSearchValue(val);
    },
    []
  );

  // ============ 视口适配：弹出层挂载到 body ============

  const getPopupContainer = useCallback(
    (node: HTMLElement) => node.parentElement || document.body,
    []
  );

  // ============ 自定义搜索过滤（使用防抖后的值） ============

  const filterTreeNode = useCallback(
    (inputValue: string, node: Record<string, unknown>) => {
      if (!matchedIds) return true;
      return matchedIds.has(node.value as string);
    },
    [matchedIds]
  );

  // ============ 渲染 ============

  if (loading && tags.length === 0) {
    return (
      <div className={styles.loadingWrap}>
        <Spin size="small" />
        <span className={styles.loadingText}>加载标签库…</span>
      </div>
    );
  }

  return (
    <div className={styles.selectorWrap}>
      <TreeSelect
        value={value}
        onChange={onChange}
        treeData={treeData}
        placeholder={placeholder}
        disabled={disabled}
        multiple
        treeCheckable
        showCheckedStrategy={TreeSelect.SHOW_CHILD}
        treeDefaultExpandAll={false}
        treeExpandedKeys={searchExpandedKeys}
        onTreeExpand={setExpandedKeys}
        // 虚拟滚动（大数据量性能保障）
        virtual
        treeLine={{ showLeafIcon: false }}
        // 搜索
        showSearch
        searchValue={searchValue}
        onSearch={handleSearch}
        filterTreeNode={filterTreeNode}
        treeNodeFilterProp="title"
        // 视口适配
        getPopupContainer={getPopupContainer}
        dropdownMatchSelectWidth
        listHeight={280}
        // Tag 显示
        maxTagCount={maxTagCount}
        maxTagPlaceholder={(omittedValues) =>
          `+${omittedValues.length} 项…`
        }
        // 图标
        suffixIcon={<TagOutlined />}
        notFoundContent={
          <div className={styles.emptyState}>
            {loading ? "加载中…" : "暂无标签，请先在标签库中创建"}
          </div>
        }
        className={styles.treeSelect}
        popupClassName={styles.popup}
      />
    </div>
  );
}
