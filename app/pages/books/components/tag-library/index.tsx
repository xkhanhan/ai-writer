"use client";

import React, { useState } from "react";
import { Button, Input, Breadcrumb } from "antd";
import { TagsOutlined, DeleteOutlined } from "@ant-design/icons";
import { EmptyState } from "@/shared/ui/empty-state";
import { confirmDelete } from "@/shared/ui/confirm-delete";
import type { Book, TagCategory } from "@/app/types";
import styles from "./index.module.css";

interface TagLibraryProps {
  book: Book;
}

type ViewState =
  | { type: "list" }
  | { type: "create"; parentId?: string }
  | { type: "edit"; tag: TagCategory };

export default function TagLibrary({ book }: TagLibraryProps) {
  const [categories, setCategories] = useState<TagCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [view, setView] = useState<ViewState>({ type: "list" });

  // 表单状态
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");

  // ---- 工具函数 ----

  const resetForm = () => {
    setFormName("");
    setFormDescription("");
  };

  /** 在树中递归查找节点 */
  const findInTree = (
    nodes: TagCategory[],
    id: string
  ): TagCategory | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findInTree(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  /** 在树中递归替换节点 */
  const replaceInTree = (
    nodes: TagCategory[],
    id: string,
    updater: (n: TagCategory) => TagCategory
  ): TagCategory[] =>
    nodes.map((n) => {
      if (n.id === id) return updater(n);
      if (n.children) {
        return { ...n, children: replaceInTree(n.children, id, updater) };
      }
      return n;
    });

  /** 在树中递归删除节点 */
  const removeFromTree = (nodes: TagCategory[], id: string): TagCategory[] =>
    nodes
      .filter((n) => n.id !== id)
      .map((n) =>
        n.children ? { ...n, children: removeFromTree(n.children, id) } : n
      );

  /** 在树中递归添加子节点 */
  const addChildToTree = (
    nodes: TagCategory[],
    parentId: string,
    child: TagCategory
  ): TagCategory[] =>
    nodes.map((n) => {
      if (n.id === parentId) {
        return { ...n, children: [...(n.children ?? []), child] };
      }
      if (n.children) {
        return { ...n, children: addChildToTree(n.children, parentId, child) };
      }
      return n;
    });

  // ---- 事件处理 ----

  const selectedCategory = selectedCategoryId
    ? categories.find((c) => c.id === selectedCategoryId) ?? null
    : null;

  const handleSelectCategory = (cat: TagCategory) => {
    setSelectedCategoryId(cat.id);
    setSelectedTagId(null);
    setView({ type: "list" });
    resetForm();
  };

  const handleSelectTag = (tag: TagCategory) => {
    setSelectedTagId(tag.id);
    setView({ type: "edit", tag });
    setFormName(tag.name);
    setFormDescription(tag.description ?? "");
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

  const handleSave = () => {
    if (!formName.trim()) return;

    if (view.type === "create") {
      const newTag: TagCategory = {
        id: `tc_${Date.now()}`,
        bookId: book.id,
        name: formName.trim(),
        description: formDescription || undefined,
        parentId: view.parentId,
      };
      if (view.parentId) {
        setCategories((prev) => addChildToTree(prev, view.parentId!, newTag));
      } else {
        setCategories((prev) => [...prev, newTag]);
      }
      resetForm();
      setView({ type: "list" });
    } else if (view.type === "edit") {
      const updated: TagCategory = {
        ...view.tag,
        name: formName.trim(),
        description: formDescription || undefined,
      };
      setCategories((prev) => replaceInTree(prev, view.tag.id, () => updated));
      setView({ type: "edit", tag: updated });
    }
  };

  const handleDelete = (tag: TagCategory) => {
    confirmDelete(tag.name, () => {
      setCategories((prev) => removeFromTree(prev, tag.id));
      if (selectedTagId === tag.id) {
        setSelectedTagId(null);
        setView({ type: "list" });
      }
    });
  };

  const handleToggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCancel = () => {
    resetForm();
    setView({ type: "list" });
    if (selectedTagId) {
      const tag = findInTree(categories, selectedTagId);
      if (tag) {
        setView({ type: "edit", tag });
      }
    }
  };

  // ---- 渲染 ----

  /** 渲染标签树节点 */
  const renderTagNode = (tag: TagCategory, depth: number) => {
    const hasChildren = tag.children && tag.children.length > 0;
    const isExpanded = expandedIds.has(tag.id);
    const isActive = selectedTagId === tag.id;

    return (
      <React.Fragment key={tag.id}>
        <div
          className={`${styles.tagNode} ${isActive ? styles.tagNodeActive : ""}`}
          style={{ paddingLeft: 12 + depth * 20 }}
          onClick={() => handleSelectTag(tag)}
        >
          <span
            className={styles.expandArrow}
            onClick={(e) => {
              e.stopPropagation();
              if (hasChildren) handleToggleExpand(tag.id);
            }}
          >
            {hasChildren ? (isExpanded ? "▾" : "▸") : ""}
          </span>
          <span className={styles.tagName}>{tag.name}</span>
          <span
            className={styles.tagEditLink}
            onClick={(e) => {
              e.stopPropagation();
              handleSelectTag(tag);
            }}
          >
            编辑
          </span>
        </div>
        {hasChildren && isExpanded && (
          <div>
            {tag.children!.map((child) => renderTagNode(child, depth + 1))}
          </div>
        )}
      </React.Fragment>
    );
  };

  // 表单视图
  if (view.type === "create" || view.type === "edit") {
    const isEdit = view.type === "edit";
    return (
      <div className={styles.container}>
        <div className={styles.breadcrumbBar}>
          <Breadcrumb
            items={[
              { title: "标签库" },
              ...(selectedCategory
                ? [{ title: selectedCategory.name, className: styles.breadcrumbLink, onClick: () => { setSelectedCategoryId(selectedCategory.id); setSelectedTagId(null); setView({ type: "list" }); resetForm(); } }]
                : []),
              {
                title: isEdit ? "编辑标签" : "新建标签",
                onClick: handleCancel,
                className: styles.breadcrumbLink,
              },
            ]}
          />
        </div>

        <div className={styles.formArea}>
          <div className={styles.formContent}>
            <div className={styles.formField}>
              <label className={styles.formLabel}>标签名称</label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="输入标签名称"
                maxLength={60}
              />
            </div>

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

            <div className={styles.formField}>
              <label className={styles.formLabel}>标签详情描述</label>
              <Input.TextArea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="描述该标签的详细信息"
                rows={6}
              />
            </div>
          </div>

          <div className={styles.formActions}>
            {isEdit && (
              <div className={styles.formActionsLeft}>
                <Button
                  size="small"
                  onClick={() => handleCreateSubTag(view.tag.id)}
                >
                  + 添加子标签
                </Button>
              </div>
            )}
            <div className={styles.formActionsRight}>
              {isEdit && (
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDelete(view.tag)}
                >
                  删除
                </Button>
              )}
              <Button onClick={handleCancel}>取消</Button>
              <Button
                type="primary"
                onClick={handleSave}
                disabled={!formName.trim()}
              >
                保存
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 列表视图
  return (
    <div className={styles.container}>
      <div className={styles.mainArea}>
        {/* 左侧：大类列表 */}
        <div className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <span className={styles.sidebarTitle}>标签大类</span>
            <Button type="link" size="small" onClick={handleCreateCategory}>
              + 新建大类
            </Button>
          </div>

          <div className={styles.categoryList}>
            {categories.length === 0 ? (
              <div className={styles.emptyList}>暂无标签大类</div>
            ) : (
              categories.map((cat) => (
                <div
                  key={cat.id}
                  className={`${styles.categoryItem} ${
                    selectedCategoryId === cat.id ? styles.categoryItemActive : ""
                  }`}
                  onClick={() => handleSelectCategory(cat)}
                >
                  <span className={styles.categoryName}>{cat.name}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 右侧：标签树 + 详情 */}
        <div className={styles.contentArea}>
          {!selectedCategory ? (
            <EmptyState
              icon={<TagsOutlined />}
              title="选择一个标签大类"
              description="从左侧选择大类查看其下标签，或新建大类开始"
              action={
                <button onClick={handleCreateCategory}>+ 新建大类</button>
              }
            />
          ) : (
            <div className={styles.tagPanel}>
              <div className={styles.tagTree}>
                <div className={styles.tagTreeHeader}>
                  <span className={styles.tagTreeTitle}>
                    {selectedCategory.name} 的标签
                  </span>
                  <Button
                    type="link"
                    size="small"
                    onClick={() => handleCreateSubTag(selectedCategory.id)}
                  >
                    + 添加子标签
                  </Button>
                </div>
                <div className={styles.tagTreeContent}>
                  {selectedCategory.children &&
                  selectedCategory.children.length > 0 ? (
                    selectedCategory.children.map((child) =>
                      renderTagNode(child, 0)
                    )
                  ) : (
                    <div className={styles.emptyList}>
                      暂无子标签，点击上方「添加子标签」创建
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
