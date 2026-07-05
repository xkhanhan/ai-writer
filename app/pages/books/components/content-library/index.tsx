"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Modal, Button, Breadcrumb } from "antd";
import { BookOutlined } from "@ant-design/icons";
import { AiDropdown } from "@/shared/ui/ai-dropdown";
import { EmptyState } from "@/shared/ui/empty-state";
import {
  fetchArchives,
  getArchive,
} from "@/app/pages/books/api/creation";
import type { Book, ArchivedChapter } from "@/app/types";
import styles from "./index.module.css";

interface ContentLibraryProps {
  book: Book;
}

export default function ContentLibrary({ book }: ContentLibraryProps) {
  const [archives, setArchives] = useState<ArchivedChapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<ArchivedChapter | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setArchives(await fetchArchives(book.id));
    } finally {
      setLoading(false);
    }
  }, [book.id]);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  const handlePreview = async (id: string) => {
    const a = await getArchive(id);
    setPreview(a);
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
                    { key: "deai", label: "去除 AI 味" },
                    { key: "polish", label: "全文润色" },
                    { key: "expand", label: "扩写" },
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

      <Modal
        open={!!preview}
        title={preview ? `第${preview.sortOrder + 1}章 ${preview.title}` : ""}
        onCancel={() => setPreview(null)}
        footer={
          <Button key="close" onClick={() => setPreview(null)}>
            关闭
          </Button>
        }
        width={720}
      >
        {preview && (
          <pre className={styles.modalContent}>{preview.content}</pre>
        )}
      </Modal>
    </div>
  );
}
