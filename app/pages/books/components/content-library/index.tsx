"use client";

import { useState, useEffect, useCallback } from "react";
import { Breadcrumb } from "antd";
import { BookOutlined } from "@ant-design/icons";
import { AiDropdown } from "@/shared/ui/ai-dropdown";
import { AiSceneModal } from "@/shared/ui/ai-scene-modal";
import { EmptyState } from "@/shared/ui/empty-state";
import BaseModal from "@/shared/ui/base-modal";
import {
  fetchArchives,
  getArchive,
} from "@/app/pages/books/api/creation";
import { getContentLibraryScenes } from "@/app/pages/books/config/ai-scenes";
import { showError } from "@/app/utils/error-handler";
import type { Book, ArchivedChapter } from "@/app/types";
import type { AiSceneConfig } from "@/shared/ui/ai-scene-modal";
import styles from "./index.module.css";

interface ContentLibraryProps {
  book: Book;
}

export default function ContentLibrary({ book }: ContentLibraryProps) {
  const [archives, setArchives] = useState<ArchivedChapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<ArchivedChapter | null>(null);

  // AI modal state
  const [aiOpen, setAiOpen] = useState(false);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [selectedArchiveId, setSelectedArchiveId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await fetchArchives(book.id);
    if (result.ok) {
      setArchives(result.data);
    }
    setLoading(false);
  }, [book.id]);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  const handlePreview = async (id: string) => {
    const result = await getArchive(id);
    if (result.ok) {
      setPreview(result.data);
    } else {
      showError(result.error || "获取内容失败");
    }
  };

  // Derive the active AI scene config from state
  const scenes = getContentLibraryScenes(selectedArchiveId ?? undefined);
  const activeScene: AiSceneConfig | undefined =
    activeSceneId != null ? scenes.find((s) => s.id === activeSceneId) : undefined;

  const handleAiSceneClick = (sceneId: string, archiveId: string) => {
    setActiveSceneId(sceneId);
    setSelectedArchiveId(archiveId);
    setAiOpen(true);
  };

  const handleAiClose = () => {
    setAiOpen(false);
    setActiveSceneId(null);
    setSelectedArchiveId(null);
  };

  return (
    <div className={styles.container}>
      <div className={styles.breadcrumbBar}>
        <Breadcrumb items={[{ title: "正文库" }]} />
      </div>

      {loading ? (
        <div className={styles.list}>加载中...</div>
      ) : archives.length === 0 ? (
        <EmptyState
          icon={<BookOutlined />}
          title="还没有过审正文"
          description="在创作区写完正文并通过审核后，内容会自动归入正文库"
        />
      ) : (
        <div className={styles.list}>
          {archives.map((a) => (
            <div key={a.id} className={styles.item}>
              <div className={styles.itemHeader}>
                <span className={styles.chapterTitle}>
                  第{a.sortOrder + 1}章 · {a.title}
                </span>
                <span className={styles.wordCount}>
                  {a.wordCount.toLocaleString()} 字
                </span>
              </div>
              <div className={styles.preview}>{a.content}</div>
              <div className={styles.actions}>
                <AiDropdown
                  items={[
                    { key: "deai", label: "去除 AI 味", onClick: () => handleAiSceneClick("deslop", a.id) },
                    { key: "polish", label: "全文润色", onClick: () => handleAiSceneClick("polish", a.id) },
                    { key: "expand", label: "扩写", onClick: () => handleAiSceneClick("expand", a.id) },
                  ]}
                />
                <span
                  className={styles.viewLink}
                  onClick={() => handlePreview(a.id)}
                >
                  查看 →
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <BaseModal
        open={!!preview}
        title={preview ? `第${preview.sortOrder + 1}章 ${preview.title}` : ""}
        onCancel={() => setPreview(null)}
        okText="关闭"
        cancelText=""
        width={720}
        destroyOnClose={false}
      >
        {preview && (
          <pre className={styles.modalContent}>{preview.content}</pre>
        )}
      </BaseModal>

      {activeScene && (
        <AiSceneModal
          open={aiOpen}
          scene={activeScene}
          bookId={book.id}
          onClose={handleAiClose}
          onSaved={handleAiClose}
          onSave={async () => {
            /* Text results — no DB save needed for now */
          }}
        />
      )}
    </div>
  );
}
