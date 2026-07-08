"use client";

import { useState, useCallback, useMemo } from "react";
import {
  PlusOutlined,
  DownOutlined,
  RightOutlined,
  FileTextOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { Checkbox } from "antd";
import { showError, showSuccess } from "@/app/utils/error-handler";
import { confirmDelete } from "@/shared/ui/confirm-delete";
import type { ChapterOutline } from "@/app/types";
import type { CreationZoneState } from "@/app/pages/books/hooks/use-creation-zone";
import styles from "./index.module.css";

type SelectableItem = { kind: "volume"; id: string } | { kind: "chapter"; id: string; volumeId: string };

export function NavigationTree({ zone }: { zone: CreationZoneState }) {
  const { volumes, chaptersMap, expandedVolumes, view, setView, toggleVolume, removeVolume, removeChapter } = zone;

  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const allItems = useMemo<SelectableItem[]>(() => {
    const items: SelectableItem[] = [];
    for (const vol of volumes) {
      items.push({ kind: "volume", id: vol.id });
      const chapters = chaptersMap[vol.id] || [];
      for (const ch of chapters) {
        items.push({ kind: "chapter", id: ch.id, volumeId: vol.id });
      }
    }
    return items;
  }, [volumes, chaptersMap]);

  const allSelected = allItems.length > 0 && allItems.every((it) => selected.has(it.kind === "volume" ? `v:${it.id}` : `c:${it.id}`));

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      const next = new Set<string>();
      for (const it of allItems) {
        next.add(it.kind === "volume" ? `v:${it.id}` : `c:${it.id}`);
      }
      setSelected(next);
    }
  }, [allSelected, allItems]);

  const toggleItem = useCallback((key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleDeleteVolume = useCallback(
    (volId: string, volTitle: string) => {
      confirmDelete(volTitle, async () => {
        await removeVolume(volId);
        showSuccess("卷纲已删除");
        if (view.type === "volume-form" && view.volumeId === volId) {
          setView({ type: "empty" });
        }
      });
    },
    [removeVolume, view, setView]
  );

  const handleDeleteChapter = useCallback(
    (volumeId: string, chId: string, chTitle: string) => {
      confirmDelete(chTitle, async () => {
        await removeChapter(volumeId, chId);
        showSuccess("章纲已删除");
        if ((view.type === "content-editor" || view.type === "chapter-form") && view.chapterId === chId) {
          setView({ type: "empty" });
        }
      });
    },
    [removeChapter, view, setView]
  );

  const handleBatchDelete = useCallback(async () => {
    const volIds: string[] = [];
    const chItems: { volumeId: string; chapterId: string }[] = [];

    for (const key of selected) {
      if (key.startsWith("v:")) {
        volIds.push(key.slice(2));
      } else if (key.startsWith("c:")) {
        const item = allItems.find((it) => it.kind === "chapter" && `c:${it.id}` === key);
        if (item && item.kind === "chapter") {
          chItems.push({ volumeId: item.volumeId, chapterId: item.id });
        }
      }
    }

    const total = volIds.length + chItems.length;
    if (total === 0) return;

    confirmDelete(`已选的 ${total} 个项目`, async () => {
      try {
        await Promise.all([
          ...volIds.map((id) => removeVolume(id)),
          ...chItems.map(({ volumeId, chapterId }) => removeChapter(volumeId, chapterId)),
        ]);
        showSuccess(`已删除 ${total} 个项目`);
        setSelected(new Set());
        setSelectMode(false);
        setView({ type: "empty" });
      } catch {
        showError("部分删除失败，请重试");
      }
    });
  }, [selected, allItems, removeVolume, removeChapter, setView]);

  const selectedCount = selected.size;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>创作区</span>
        <button
          className={`${styles.modeBtn} ${selectMode ? styles.modeBtnActive : ""}`}
          onClick={() => {
            setSelectMode((prev) => !prev);
            setSelected(new Set());
          }}
        >
          {selectMode ? "退出选择" : "选择"}
        </button>
      </div>

      {selectMode && (
        <div className={styles.batchBar}>
          <Checkbox checked={allSelected} onChange={toggleSelectAll}>
            全选
          </Checkbox>
        </div>
      )}

      <div className={styles.body}>
        {/* 总纲 */}
        <div
          className={`${styles.outlineItem} ${view.type === "outline" ? styles.outlineActive : ""}`}
          onClick={() => { if (!selectMode) setView({ type: "outline" }); }}
        >
          <FileTextOutlined className={styles.outlineIcon} />
          <div>
            <div className={styles.outlineTitle}>总纲</div>
            <div className={styles.outlineSub}>模糊方向</div>
          </div>
        </div>

        {/* 卷列表 */}
        {volumes.map((vol) => {
          const chapters = chaptersMap[vol.id] || [];
          const expanded = expandedVolumes.has(vol.id);
          const isActive = view.type === "volume-form" && view.volumeId === vol.id;
          const volKey = `v:${vol.id}`;
          const volChecked = selected.has(volKey);
          return (
            <div key={vol.id} className={styles.volumeGroup}>
              <div
                className={`${styles.volumeBar} ${isActive ? styles.volumeActive : ""}`}
                onClick={() => { if (!selectMode) toggleVolume(vol.id); }}
              >
                {selectMode ? (
                  <Checkbox
                    checked={volChecked}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggleItem(volKey)}
                    className={styles.itemCheckbox}
                  />
                ) : (
                  expanded ? (
                    <DownOutlined className={styles.arrow} />
                  ) : (
                    <RightOutlined className={styles.arrow} />
                  )
                )}
                <span className={styles.volumeTitle}>{vol.title}</span>
                <span className={styles.volumeCount}>{chapters.length}章</span>
                {!selectMode && (
                  <DeleteOutlined
                    className={styles.deleteBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteVolume(vol.id, vol.title);
                    }}
                  />
                )}
              </div>
              {expanded && (
                <div className={styles.chapterList}>
                  {chapters.map((ch) => (
                    <ChapterItem
                      key={ch.id}
                      chapter={ch}
                      isActive={
                        (view.type === "content-editor" || view.type === "chapter-form") &&
                        view.chapterId === ch.id
                      }
                      onClick={() => { if (!selectMode) setView({ type: "content-editor", volumeId: vol.id, chapterId: ch.id }); }}
                      selectMode={selectMode}
                      checked={selected.has(`c:${ch.id}`)}
                      onToggle={() => toggleItem(`c:${ch.id}`)}
                      onDelete={() => handleDeleteChapter(vol.id, ch.id, ch.title)}
                    />
                  ))}
                  {!selectMode && (
                    <div
                      className={styles.addChapter}
                      onClick={() => setView({ type: "chapter-form", volumeId: vol.id })}
                    >
                      <PlusOutlined /> 添加章纲
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* 新建卷 */}
        {!selectMode && (
          <div className={styles.addVolume} onClick={() => setView({ type: "volume-form" })}>
            <PlusOutlined /> 新建卷
          </div>
        )}
      </div>

      {/* 浮动批量操作栏 */}
      {selectMode && selectedCount > 0 && (
        <div className={styles.floatingBar}>
          <span className={styles.floatingInfo}>已选 {selectedCount} 项</span>
          <button className={styles.floatingDeleteBtn} onClick={handleBatchDelete}>
            <DeleteOutlined /> 批量删除
          </button>
        </div>
      )}
    </div>
  );
}

function ChapterItem({
  chapter,
  isActive,
  onClick,
  selectMode,
  checked,
  onToggle,
  onDelete,
}: {
  chapter: ChapterOutline;
  isActive: boolean;
  onClick: () => void;
  selectMode: boolean;
  checked: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const statusClass =
    chapter.status === "done"
      ? styles.statusDone
      : chapter.status === "writing"
        ? styles.statusWriting
        : styles.statusPlanned;
  return (
    <div
      className={`${styles.chapterItem} ${statusClass} ${isActive ? styles.chapterActive : ""}`}
      onClick={onClick}
    >
      {selectMode ? (
        <Checkbox
          checked={checked}
          onClick={(e) => e.stopPropagation()}
          onChange={onToggle}
          className={styles.itemCheckbox}
        />
      ) : null}
      <span className={styles.chapterTitle}>
        第{chapter.sortOrder + 1}章 {chapter.title}
      </span>
      <span className={styles.chapterStatus}>
        {chapter.status === "done"
          ? "✓"
          : chapter.status === "writing"
            ? "撰写中"
            : chapter.summary
              ? "已规划"
              : "待写"}
      </span>
      {!selectMode && (
        <DeleteOutlined
          className={styles.deleteBtn}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        />
      )}
    </div>
  );
}
