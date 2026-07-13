"use client";

import { useState, useCallback } from "react";
import {
  PlusOutlined,
  DownOutlined,
  FileTextOutlined,
  DeleteOutlined,
  EditOutlined,
} from "@ant-design/icons";
import { showError, showSuccess } from "@/app/utils/error-handler";
import { confirmDelete } from "@/shared/ui/confirm-delete";
import type { ChapterOutline } from "@/app/types";
import type { CreationZoneState } from "@/app/pages/books/hooks/use-creation-zone";
import styles from "./index.module.css";

interface Props {
  zone: CreationZoneState;
  onOpenVolume: (volId?: string) => void;
}

export function NavigationTree({ zone, onOpenVolume }: Props) {
  const { volumes, chaptersMap, expandedVolumes, view, setView, toggleVolume, removeVolume, removeChapter } = zone;

  const [addMenuOpen, setAddMenuOpen] = useState(false);

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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>大纲</span>
        <div className={styles.addWrapper}>
          <button
            className={styles.addBtn}
            onClick={() => setAddMenuOpen(!addMenuOpen)}
          >
            <PlusOutlined />
          </button>
          {addMenuOpen && (
            <div className={styles.addMenu}>
              <div
                className={styles.addMenuItem}
                onClick={() => {
                  setAddMenuOpen(false);
                  onOpenVolume();
                }}
              >
                新建卷
              </div>
              {volumes.length > 0 && (
                <div
                  className={styles.addMenuItem}
                  onClick={() => {
                    setAddMenuOpen(false);
                    const volId = volumes[volumes.length - 1].id;
                    setView({ type: "chapter-form", volumeId: volId });
                  }}
                >
                  新建章
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className={styles.body}>
        {/* 总纲 */}
        <div
          className={`${styles.navItem} ${view.type === "outline" ? styles.navItemActive : ""}`}
          onClick={() => setView({ type: "outline" })}
        >
          <FileTextOutlined className={styles.navItemIcon} />
          <span className={styles.navItemLabel}>总纲</span>
        </div>

        {/* 卷列表 */}
        {volumes.map((vol) => {
          const chapters = chaptersMap[vol.id] || [];
          const expanded = expandedVolumes.has(vol.id);

          return (
            <div key={vol.id} className={styles.volumeGroup}>
              <div
                className={styles.volumeHeader}
                onClick={() => toggleVolume(vol.id)}
              >
                <span className={`${styles.volumeArrow} ${expanded ? "" : styles.volumeArrowCollapsed}`}>
                  <DownOutlined />
                </span>
                <span className={styles.volumeTitle}>{vol.title}</span>
                <span className={styles.volumeBadge}>{chapters.length}</span>
                <EditOutlined
                  className={styles.editBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenVolume(vol.id);
                  }}
                />
                <DeleteOutlined
                  className={styles.deleteBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteVolume(vol.id, vol.title);
                  }}
                />
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
                      onClick={() => setView({ type: "content-editor", volumeId: vol.id, chapterId: ch.id })}
                      onDelete={() => handleDeleteChapter(vol.id, ch.id, ch.title)}
                    />
                  ))}
                  <div
                    className={styles.addChapter}
                    onClick={() => setView({ type: "chapter-form", volumeId: vol.id })}
                  >
                    <PlusOutlined /> 添加章纲
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChapterItem({
  chapter,
  isActive,
  onClick,
  onDelete,
}: {
  chapter: ChapterOutline;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`${styles.chapterItem} ${isActive ? styles.chapterItemActive : ""}`}
      onClick={onClick}
    >
      <span className={styles.chapterNum}>
        {String(chapter.sortOrder + 1).padStart(2, "0")}
      </span>
      <span className={styles.chapterTitle}>{chapter.title}</span>
      <DeleteOutlined
        className={styles.deleteBtn}
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      />
    </div>
  );
}
