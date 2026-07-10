"use client";

import type { ReactNode } from "react";
import { BookOutlined } from "@ant-design/icons";
import { useCreationZone } from "@/app/pages/books/hooks/use-creation-zone";
import type { CreationZoneState } from "@/app/pages/books/hooks/use-creation-zone";
import { NavigationTree } from "./components/navigation-tree";
import { OutlineEditor } from "./components/outline-editor";
import { VolumeForm } from "./components/volume-form";
import { ChapterForm } from "./components/chapter-form";
import { ContentEditor } from "./components/content-editor";
import styles from "./index.module.css";

interface CreationZoneProps {
  bookId: string;
}

export function CreationZone({ bookId }: CreationZoneProps) {
  const zone = useCreationZone(bookId);

  return (
    <div className={styles.container}>
      <div className={styles.navigation}>
        <NavigationTree zone={zone} />
      </div>
      <div className={styles.content}>{renderView(bookId, zone)}</div>
    </div>
  );
}

function renderView(bookId: string, zone: CreationZoneState): ReactNode {
  const { view } = zone;
  switch (view.type) {
    case "empty":
      return <EmptyState zone={zone} />;
    case "outline":
      return (
        <OutlineEditor
          outline={zone.outline}
          onSave={zone.saveOutline}
          onCancel={() => zone.setView({ type: "empty" })}
        />
      );
    case "volume-form":
      return (
        <VolumeForm
          volume={zone.volumes.find((v) => v.id === view.volumeId)}
          onSave={zone.saveVolume}
          onDelete={zone.removeVolume}
          onCancel={() => zone.setView({ type: "empty" })}
        />
      );
    case "chapter-form":
      return (
        <ChapterForm
          volumeId={view.volumeId}
          chapter={zone.chaptersMap[view.volumeId]?.find((c) => c.id === view.chapterId)}
          onSave={(data) => zone.saveChapter(view.volumeId, data)}
          onDelete={zone.removeChapter}
          onCancel={() => zone.setView({ type: "empty" })}
        />
      );
    case "content-editor":
      return <ContentEditor key={view.chapterId} bookId={bookId} volumeId={view.volumeId} chapterId={view.chapterId} zone={zone} />;
    default:
      return <EmptyState zone={zone} />;
  }
}

function EmptyState({ zone }: { zone: CreationZoneState }) {
  return (
    <div className={styles.emptyState}>
      <BookOutlined className={styles.emptyIcon} />
      <h3 className={styles.emptyTitle}>开始你的创作</h3>
      <p className={styles.emptyDesc}>
        建议的创作流程：<br />
        1. 先写总纲（模糊的整体方向）<br />
        2. 新建第一卷，填写卷纲<br />
        3. 在卷下添加章纲<br />
        4. 根据章纲写正文
      </p>
      <div className={styles.emptyActions}>
        <button className={styles.btnSecondary} onClick={() => zone.setView({ type: "outline" })}>
          编辑总纲
        </button>
        <button className={styles.btnPrimary} onClick={() => zone.setView({ type: "volume-form" })}>
          新建第一卷
        </button>
      </div>
    </div>
  );
}
