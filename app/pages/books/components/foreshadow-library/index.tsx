"use client";

import React, { useState, useMemo } from "react";
import { Button, Input, Breadcrumb } from "antd";
import { PushpinOutlined, DeleteOutlined } from "@ant-design/icons";
import { EmptyState } from "@/shared/ui/empty-state";
import { confirmDelete } from "@/shared/ui/confirm-delete";
import type { Book, Foreshadow, ForeshadowStatus } from "@/app/types";
import styles from "./index.module.css";

interface ForeshadowLibraryProps {
  book: Book;
}

type FilterType = "all" | "hidden" | "revealed";

type ViewState =
  | { type: "list" }
  | { type: "create" }
  | { type: "edit"; item: Foreshadow };

const statusLabels: Record<ForeshadowStatus, string> = {
  hidden: "未揭晓",
  revealed: "已揭晓",
};

const filterOptions: { key: FilterType; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "hidden", label: "未揭晓" },
  { key: "revealed", label: "已揭晓" },
];

export default function ForeshadowLibrary({ book }: ForeshadowLibraryProps) {
  const [items, setItems] = useState<Foreshadow[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewState>({ type: "list" });

  // 表单状态
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStatus, setFormStatus] = useState<ForeshadowStatus>("hidden");
  const [formChapterNumber, setFormChapterNumber] = useState<string>("");

  const resetForm = () => {
    setFormName("");
    setFormDescription("");
    setFormStatus("hidden");
    setFormChapterNumber("");
  };

  // 筛选 + 搜索 + 排序
  const filteredItems = useMemo(() => {
    let result = items;
    if (filter !== "all") {
      result = result.filter((f) => f.status === filter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.description.toLowerCase().includes(q)
      );
    }
    // 按章节号升序排列
    return [...result].sort((a, b) => {
      const ca = a.chapterNumber ?? Number.MAX_SAFE_INTEGER;
      const cb = b.chapterNumber ?? Number.MAX_SAFE_INTEGER;
      return ca - cb;
    });
  }, [items, filter, search]);

  // 分组
  const hiddenItems = filteredItems.filter((f) => f.status === "hidden");
  const revealedItems = filteredItems.filter((f) => f.status === "revealed");

  const handleCreate = () => {
    resetForm();
    setView({ type: "create" });
  };

  const handleEdit = (item: Foreshadow) => {
    setFormName(item.name);
    setFormDescription(item.description);
    setFormStatus(item.status);
    setFormChapterNumber(item.chapterNumber?.toString() ?? "");
    setView({ type: "edit", item });
  };

  const handleSave = () => {
    if (!formName.trim()) return;
    const chapterNum = formChapterNumber
      ? parseInt(formChapterNumber, 10)
      : undefined;

    const resolvedChapter =
      chapterNum != null && !isNaN(chapterNum) ? chapterNum : undefined;

    if (view.type === "create") {
      const newItem: Foreshadow = {
        id: `fs_${Date.now()}`,
        bookId: book.id,
        name: formName.trim(),
        description: formDescription,
        status: formStatus,
        chapterNumber: resolvedChapter,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setItems((prev) => [...prev, newItem]);
    } else if (view.type === "edit") {
      const updated: Foreshadow = {
        ...view.item,
        name: formName.trim(),
        description: formDescription,
        status: formStatus,
        chapterNumber: resolvedChapter,
        updatedAt: new Date().toISOString(),
      };
      setItems((prev) =>
        prev.map((f) => (f.id === view.item.id ? updated : f))
      );
    }

    resetForm();
    setView({ type: "list" });
  };

  const handleDelete = (item: Foreshadow) => {
    confirmDelete(item.name, () => {
      setItems((prev) => prev.filter((f) => f.id !== item.id));
      if (view.type === "edit" && view.item.id === item.id) {
        setView({ type: "list" });
      }
    });
  };

  const handleCancel = () => {
    resetForm();
    setView({ type: "list" });
  };

  // 渲染伏笔项
  const renderItem = (item: Foreshadow) => {
    const isRevealed = item.status === "revealed";
    return (
      <div
        key={item.id}
        className={`${styles.item} ${isRevealed ? styles.itemRevealed : ""}`}
        onClick={() => handleEdit(item)}
      >
        <div className={styles.itemTop}>
          <span
            className={`${styles.itemName} ${isRevealed ? styles.itemNameStrikethrough : ""}`}
          >
            {item.name}
          </span>
          <span
            className={`${styles.statusTag} ${
              item.status === "hidden" ? styles.statusHidden : styles.statusRevealed
            }`}
          >
            {statusLabels[item.status]}
          </span>
          {item.chapterNumber != null && (
            <span className={styles.chapterLink}>
              第{item.chapterNumber}章 →
            </span>
          )}
        </div>
        {item.description && (
          <div className={styles.itemDesc}>{item.description}</div>
        )}
      </div>
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
              { title: "伏笔库" },
              {
                title: isEdit ? "编辑伏笔" : "新建伏笔",
                onClick: handleCancel,
                className: styles.breadcrumbLink,
              },
            ]}
          />
        </div>

        <div className={styles.formArea}>
          <div className={styles.formContent}>
            <div className={styles.formField}>
              <label className={styles.formLabel}>伏笔名称</label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="输入伏笔名称"
                maxLength={60}
              />
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel}>状态</label>
              <div className={styles.statusSelector}>
                <button
                  className={`${styles.statusOption} ${
                    formStatus === "hidden" ? styles.statusOptionActive : ""
                  }`}
                  onClick={() => setFormStatus("hidden")}
                >
                  未揭晓
                </button>
                <button
                  className={`${styles.statusOption} ${
                    formStatus === "revealed" ? styles.statusOptionActive : ""
                  }`}
                  onClick={() => setFormStatus("revealed")}
                >
                  已揭晓
                </button>
              </div>
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel}>关联章节号</label>
              <Input
                value={formChapterNumber}
                onChange={(e) => setFormChapterNumber(e.target.value)}
                placeholder="可选，输入章节编号"
                style={{ width: 200 }}
              />
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel}>伏笔描述</label>
              <Input.TextArea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="描述这条伏笔的内容和走向"
                rows={6}
              />
            </div>
          </div>

          <div className={styles.formActions}>
            {isEdit && (
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDelete(view.item)}
              >
                删除
              </Button>
            )}
            <div className={styles.formActionsRight}>
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
      <div className={styles.breadcrumbBar}>
        <Breadcrumb items={[{ title: "伏笔库" }]} />
      </div>

      {/* 搜索 + 筛选 */}
      <div className={styles.toolbar}>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索伏笔..."
          allowClear
          className={styles.searchInput}
        />
        <div className={styles.filterGroup}>
          {filterOptions.map((opt) => (
            <button
              key={opt.key}
              className={`${styles.filterBtn} ${
                filter === opt.key ? styles.filterBtnActive : ""
              }`}
              onClick={() => setFilter(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <Button type="link" size="small" onClick={handleCreate}>
          + 新建
        </Button>
      </div>

      {/* 伏笔列表 */}
      <div className={styles.itemList}>
        {filteredItems.length === 0 ? (
          <EmptyState
            icon={<PushpinOutlined />}
            title="还没有伏笔"
            description="点击「新建」添加第一条伏笔"
            action={
              <button onClick={handleCreate}>+ 新建伏笔</button>
            }
          />
        ) : (
          <>
            {hiddenItems.length > 0 && (
              <div className={styles.groupSection}>
                <div className={styles.groupTitle}>未揭晓</div>
                {hiddenItems.map(renderItem)}
              </div>
            )}
            {revealedItems.length > 0 && (
              <div className={styles.groupSection}>
                <div className={styles.groupTitle}>已揭晓</div>
                {revealedItems.map(renderItem)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
