"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Button, Input, Divider } from "antd";
import { DeleteOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import {
  PanelContainer,
  PanelGroup,
  Panel,
  Divider as PanelDivider,
} from "@/shared/ui/panel-container";
import BaseModal from "@/shared/ui/base-modal";
import { confirmDelete } from "@/shared/ui/confirm-delete";
import { TagTree } from "@/shared/ui/tag-tree";
import { useTagTree } from "@/shared/hooks/use-tag-tree";
import {
  createTag,
  updateTag,
  deleteTag,
  getTagRefCount,
} from "@/app/api-client/tags";
import type { Book, TagCategory } from "@/app/types";
import { showError, showSuccess } from "@/app/utils/error-handler";
import styles from "./index.module.css";

interface TagLibraryProps {
  book: Book;
}

type ViewState =
  | { type: "list" }
  | { type: "create"; parentId?: string }
  | { type: "edit"; tag: TagCategory };

// ---- 工具函数 ----

function findInTree(nodes: TagCategory[], id: string): TagCategory | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findInTree(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

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

function searchMatch(
  tags: TagCategory[],
  keyword: string
): Set<string> | null {
  if (!keyword.trim()) return null;
  const lower = keyword.toLowerCase();
  const matched = new Set<string>();

  interface FlatNode {
    node: TagCategory;
    path: string[];
  }
  const flat: FlatNode[] = [];
  const walk = (nodes: TagCategory[], path: string[]) => {
    for (const n of nodes) {
      flat.push({ node: n, path: [...path, n.id] });
      if (n.children) walk(n.children, [...path, n.id]);
    }
  };
  walk(tags, []);

  for (const { node, path } of flat) {
    if (
      node.name.toLowerCase().includes(lower) ||
      node.code?.toLowerCase().includes(lower) ||
      node.description?.toLowerCase().includes(lower)
    ) {
      for (const id of path) matched.add(id);
    }
  }
  return matched;
}

// ---- 持久化展开状态 ----

const EXPANDED_KEY_PREFIX = "tag-lib-expanded-";

function loadExpanded(bookId: string): string[] {
  try {
    const raw = localStorage.getItem(EXPANDED_KEY_PREFIX + bookId);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveExpanded(bookId: string, keys: string[]) {
  try {
    localStorage.setItem(EXPANDED_KEY_PREFIX + bookId, JSON.stringify(keys));
  } catch {
    // ignore
  }
}

// ---- 防抖 ----

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ---- 组件 ----

export default function TagLibrary({ book }: TagLibraryProps) {
  const { tags: categories, loading, refresh } = useTagTree(book.id);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<string[]>(() =>
    loadExpanded(book.id)
  );
  const [searchValue, setSearchValue] = useState("");
  const [view, setView] = useState<ViewState>({ type: "list" });

  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");

  // ---- 搜索 ----

  const debouncedSearch = useDebounce(searchValue, 300);
  const matchedIds = useMemo(
    () => (debouncedSearch ? searchMatch(categories, debouncedSearch) : null),
    [categories, debouncedSearch]
  );

  const searchExpandedKeys = useMemo(() => {
    if (matchedIds && matchedIds.size > 0) {
      return Array.from(collectAllIds(categories));
    }
    return [];
  }, [matchedIds, categories]);

  const effectiveExpandedKeys =
    searchExpandedKeys.length > 0 ? searchExpandedKeys : expandedKeys;

  // ---- 当前选中分类 ----

  const selectedCategory = selectedCategoryId
    ? categories.find((c) => c.id === selectedCategoryId) ?? null
    : null;

  // ---- 事件处理 ----

  const resetForm = () => {
    setFormName("");
    setFormDescription("");
  };

  const handleSelectCategory = (cat: TagCategory) => {
    setSelectedCategoryId(cat.id);
    setSelectedTagId(null);
    setView({ type: "list" });
    resetForm();
    setExpandedKeys(loadExpanded(book.id));
  };

  const handleCreateCategory = () => {
    resetForm();
    setView({ type: "create" });
    setSelectedTagId(null);
  };

  const handleCreateSubTag = (parentId: string) => {
    resetForm();
    setView({ type: "create", parentId });
  };

  const handleTreeSelect = (tag: TagCategory) => {
    setSelectedTagId(tag.id);
    setView({ type: "edit", tag });
    setFormName(tag.name);
    setFormDescription(tag.description ?? "");
  };

  const handleTreeEdit = (tag: TagCategory) => {
    setSelectedTagId(tag.id);
    setView({ type: "edit", tag });
    setFormName(tag.name);
    setFormDescription(tag.description ?? "");
  };

  const handleTreeExpand = (keys: string[]) => {
    setExpandedKeys(keys);
    if (book.id) saveExpanded(book.id, keys);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;

    if (view.type === "create") {
      const result = await createTag(book.id, {
        name: formName.trim(),
        description: formDescription || undefined,
        parentId: view.parentId,
      });
      if (!result.ok) {
        showError(result.error || "创建失败");
        return;
      }
      showSuccess("创建成功");
      resetForm();
      setView({ type: "list" });
      await refresh();
    } else if (view.type === "edit") {
      const result = await updateTag(view.tag.id, {
        name: formName.trim(),
        description: formDescription || undefined,
      });
      if (!result.ok) {
        showError(result.error || "保存失败");
        return;
      }
      showSuccess("保存成功");
      setView({ type: "edit", tag: result.data });
      await refresh();
    }
  };

  const handleDelete = async (tag: TagCategory) => {
    const refResult = await getTagRefCount(tag.id);
    const refCount = refResult.ok ? refResult.data.count : 0;
    const warning =
      refCount > 0
        ? `此标签正被 ${refCount} 个设定实体引用，删除后将自动解除关联。`
        : undefined;

    confirmDelete(
      tag.name,
      async () => {
        const result = await deleteTag(tag.id);
        if (result.ok) {
          showSuccess("删除成功");
          if (selectedTagId === tag.id) {
            setSelectedTagId(null);
            setView({ type: "list" });
          }
          await refresh();
        } else {
          showError(result.error || "删除失败");
        }
      },
      warning
    );
  };

  const handleCancel = () => {
    resetForm();
    setView({ type: "list" });
  };

  const modalOpen = view.type !== "list";
  const isEdit = view.type === "edit";
  const modalTitle = view.type === "create" ? "新建标签" : "编辑标签";

  // ---- 右侧面板 ----

  // ---- 弹窗内容 ----

  const modalContent = (
    <div className={styles.modalBody}>
      <div className={styles.formField}>
        <label className={styles.formLabel}>
          标签名称 <span style={{ color: "var(--color-error)" }}>*</span>
        </label>
        <Input
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
          placeholder="输入标签名称"
          maxLength={60}
          showCount
        />
      </div>

      {isEdit && view.tag.code && (
        <div className={styles.formField}>
          <label className={styles.formLabel}>
            编码{" "}
            <span className={styles.formLabelHint}>（系统自动生成）</span>
          </label>
          <Input
            value={view.tag.code}
            disabled
            style={{ fontFamily: "var(--font-mono)" }}
          />
          <span className={styles.formHint}>
            根据标签名称自动生成唯一编码，用于 AI 识别与数据关联
          </span>
        </div>
      )}

      {isEdit && view.tag.parentId && (
        <div className={styles.formField}>
          <label className={styles.formLabel}>父级标签</label>
          <Input
            value={(() => {
              const parent = findInTree(categories, view.tag.parentId!);
              return parent?.name ?? "";
            })()}
            disabled
          />
        </div>
      )}

      <Divider style={{ margin: "4px 0 12px" }} />

      <div className={styles.formField}>
        <label className={styles.formLabel}>标签详情描述</label>
        <Input.TextArea
          value={formDescription}
          onChange={(e) => setFormDescription(e.target.value)}
          placeholder="描述该标签的详细信息，用于 AI 理解标签含义…"
          rows={5}
          maxLength={2000}
          showCount
        />
      </div>
    </div>
  );

  // ---- 弹窗底部 ----

  const modalFooter = (
    <div className={styles.modalFooter}>
      <div className={styles.modalFooterLeft}>
        {isEdit && (
          <Button
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(view.tag)}
          >
            删除
          </Button>
        )}
      </div>
      <div className={styles.modalFooterRight}>
        <Button onClick={handleCancel}>取消</Button>
        <Button
          type="primary"
          disabled={!formName.trim()}
          onClick={handleSave}
        >
          保存
        </Button>
      </div>
    </div>
  );

  // ---- 主视图 ----

  return (
    <>
      <PanelContainer>
        <PanelGroup direction="horizontal">
          <Panel
            title="标签大类"
            defaultSize={280}
            minSize={200}
            maxSize={500}
            collapsible
            actions={
              <span className={styles.listCount}>{categories.length} 个</span>
            }
          >
            <div className={styles.searchWrap}>
              <Input
                placeholder="搜索标签名称、编码…"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                allowClear
                size="small"
                prefix={<SearchOutlined />}
              />
            </div>
            <div className={styles.catList}>
              {categories.length === 0 ? (
                <div className={styles.emptyList}>暂无标签大类</div>
              ) : (
                categories.map((cat) => (
                  <div
                    key={cat.id}
                    className={`${styles.catItem} ${
                      selectedCategoryId === cat.id ? styles.catItemActive : ""
                    }`}
                    onClick={() => handleSelectCategory(cat)}
                  >
                    <span className={styles.catName}>{cat.name}</span>
                    <span className={styles.catCount}>
                      {cat.children?.length ?? 0}
                    </span>
                  </div>
                ))
              )}
            </div>
            <div className={styles.bottomBar}>
              <Button
                type="primary"
                block
                size="small"
                onClick={handleCreateCategory}
              >
                + 新建大类
              </Button>
            </div>
          </Panel>

          <PanelDivider />

          <Panel
            title={selectedCategory ? `${selectedCategory.name} 的标签` : "标签详情"}
            defaultSize={600}
            minSize={400}
            actions={
              selectedCategory ? (
                <Button
                  type="link"
                  size="small"
                  onClick={() => handleCreateSubTag(selectedCategory.id)}
                >
                  + 添加子标签
                </Button>
              ) : undefined
            }
          >
            {selectedCategory ? (
              <div className={styles.treeWrap}>
                {(selectedCategory.children?.length ?? 0) > 0 ? (
                  <TagTree
                    tags={selectedCategory.children ?? []}
                    expandedKeys={effectiveExpandedKeys}
                    onExpand={handleTreeExpand}
                    selectedKey={selectedTagId}
                    onSelect={handleTreeSelect}
                    onEdit={handleTreeEdit}
                    onAddChild={handleCreateSubTag}
                    matchedIds={matchedIds}
                  />
                ) : (
                  <div className={styles.emptyList}>
                    暂无子标签，点击「+ 新建大类」或节点上的{" "}
                    <PlusOutlined style={{ fontSize: 10 }} /> 创建
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.emptyState}>
                选择一个标签大类
              </div>
            )}
          </Panel>
        </PanelGroup>
      </PanelContainer>

      <BaseModal
        open={modalOpen}
        title={modalTitle}
        onCancel={handleCancel}
        width={560}
        destroyOnClose
        footer={modalFooter}
      >
        {modalOpen && modalContent}
      </BaseModal>
    </>
  );
}
