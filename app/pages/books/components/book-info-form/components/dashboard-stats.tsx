"use client";

import { useMemo } from "react";
import { Descriptions, Tag, Tooltip, Typography } from "antd";
import type { Book } from "@/app/types";
import styles from "./dashboard-stats.module.css";

export function StatCell({ value, unit, label }: { value: string; unit: string; label: string }) {
  return (
    <div className={styles.statCell}>
      <div className={styles.statNum}>{value}<span className={styles.statUnit}>{unit}</span></div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );
}

export function InfoTruncate({ text }: { text?: string }) {
  if (!text) return <span className={styles.emptyDash}>—</span>;
  return (
    <Tooltip title={text} placement="topLeft">
      <span className={styles.infoTruncate}>{text}</span>
    </Tooltip>
  );
}

export function ProgressRow({ label, count, total, accent }: { label: string; count: number; total: number; accent?: boolean }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className={styles.progressRow}>
      <div className={styles.progressLabel}>{label}</div>
      <div className={styles.progressTrack}>
        <div
          className={`${styles.progressFill} ${accent ? styles.progressFillAccent : ""}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className={styles.progressCount}>{count}</div>
    </div>
  );
}

export function BookInfoCard({ book }: { book: Book }) {
  const tags = useMemo(
    () => (book.tags ? book.tags.split(",").map((t) => t.trim()).filter(Boolean) : []),
    [book.tags]
  );

  return (
    <Descriptions column={{ xs: 1, sm: 2 }} size="small" bordered>
      <Descriptions.Item label="题材">
        <InfoTruncate text={book.genre && book.subGenre ? `${book.genre} · ${book.subGenre}` : book.genre} />
      </Descriptions.Item>
      <Descriptions.Item label="平台">
        <InfoTruncate text={book.platform} />
      </Descriptions.Item>
      <Descriptions.Item label="文笔文风">
        <InfoTruncate text={book.writingStyle} />
      </Descriptions.Item>
      <Descriptions.Item label="每章字数">
        <InfoTruncate text={book.targetWordCount ? `${book.targetWordCount.toLocaleString()} 字` : undefined} />
      </Descriptions.Item>
      <Descriptions.Item label="目标总字数">
        <InfoTruncate text={book.targetTotalWords ? `${book.targetTotalWords.toLocaleString()} 万字` : undefined} />
      </Descriptions.Item>
      <Descriptions.Item label="受众">
        <InfoTruncate text={book.targetAudience} />
      </Descriptions.Item>
      <Descriptions.Item label="核心卖点" span={2}>
        <InfoTruncate text={book.sellingPoint} />
      </Descriptions.Item>
      <Descriptions.Item label="参考作品">
        <InfoTruncate text={book.referenceWorks} />
      </Descriptions.Item>
      <Descriptions.Item label="标签">
        {tags.length > 0 ? (
          <div className={styles.infoTagsWrap}>
            {tags.map((t) => (
              <Tooltip key={t} title={t.length > 20 ? t : undefined}>
                <Tag color="green" className={styles.infoTagItem}>{t}</Tag>
              </Tooltip>
            ))}
          </div>
        ) : <span className={styles.emptyDash}>—</span>}
      </Descriptions.Item>
      {book.description && (
        <Descriptions.Item label="简介" span={2}>
          <Typography.Paragraph
            ellipsis={{ rows: 2, tooltip: book.description }}
            className={styles.descText}
          >
            {book.description}
          </Typography.Paragraph>
        </Descriptions.Item>
      )}
    </Descriptions>
  );
}
