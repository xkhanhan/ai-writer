"use client";

import { useState, useEffect, useCallback } from "react";
import { Button, Empty, Modal, Tag } from "antd";
import BaseModal from "@/shared/ui/base-modal";
import { InboxOutlined, DeleteOutlined, EyeOutlined } from "@ant-design/icons";
import { fetchArchives, deleteArchive, getArchive } from "@/app/pages/books/api/creation";
import { showError, showSuccess } from "@/app/utils/error-handler";
import type { ArchivedChapter } from "@/app/types";
import styles from "./index.module.css";

export function ArchiveView({ bookId }: { bookId: string }) {
  const [archives, setArchives] = useState<ArchivedChapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<ArchivedChapter | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await fetchArchives(bookId);
    if (result.ok) {
      setArchives(result.data);
    }
    setLoading(false);
  }, [bookId]);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: "确认删除",
      content: "删除后不可恢复，确定删除该存稿吗？",
      okText: "删除",
      okType: "danger",
      cancelText: "取消",
      async onOk() {
        const result = await deleteArchive(id);
        if (result.ok) {
          showSuccess("已删除");
          load();
        } else {
          showError(result.error || "删除失败");
        }
      },
    });
  };

  const handlePreview = async (id: string) => {
    const result = await getArchive(id);
    if (result.ok) {
      setPreview(result.data);
    } else {
      showError(result.error || "获取内容失败");
    }
  };

  const totalWords = archives.reduce((sum, a) => sum + a.wordCount, 0);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <InboxOutlined className={styles.headerIcon} />
          <span className={styles.title}>正文库</span>
          <Tag color="red">{archives.length} 章</Tag>
          <Tag color="green">{totalWords} 字</Tag>
        </div>
      </div>

      {loading ? (
        <div className={styles.empty}>加载中...</div>
      ) : archives.length === 0 ? (
        <Empty className={styles.empty} description="还没有存稿，在创作区写完正文后可存入这里" />
      ) : (
        <div className={styles.list}>
          {archives.map((a) => (
            <div key={a.id} className={styles.item}>
              <div style={{ flex: 1 }}>
                <div className={styles.itemTitle}>第{a.sortOrder + 1}章 {a.title}</div>
                <div className={styles.itemMeta}>存档于 {a.archivedAt.replace("T", " ").slice(0, 16)} · {a.wordCount} 字</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Button size="small" icon={<EyeOutlined />} onClick={() => handlePreview(a.id)}>查看</Button>
                <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(a.id)}>删除</Button>
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
          <pre style={{ whiteSpace: "pre-wrap", fontFamily: "var(--font-body)", fontSize: 13, lineHeight: 1.8, margin: 0 }}>
            {preview.content}
          </pre>
        )}
      </BaseModal>
    </div>
  );
}
