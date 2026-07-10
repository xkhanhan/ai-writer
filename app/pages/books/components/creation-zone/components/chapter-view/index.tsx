"use client";

import type { ReactNode } from "react";
import { Button, Tag, Empty } from "antd";
import { EditOutlined, FileTextOutlined } from "@ant-design/icons";
import type { CreationZoneState } from "@/app/pages/books/hooks/use-creation-zone";
import styles from "./index.module.css";

interface Props {
  volumeId: string;
  chapterId: string;
  zone: CreationZoneState;
}

export function ChapterView({ volumeId, chapterId, zone }: Props) {
  const chapters = zone.chaptersMap[volumeId] || [];
  const chapter = chapters.find((c) => c.id === chapterId);

  if (!chapter) return <Empty description="未找到章纲" />;

  const statusTag = chapter.status === "done" ? { color: "green", text: "已完成" } :
    chapter.status === "writing" ? { color: "gold", text: "撰写中" } :
    { color: "default", text: "已规划" };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.chapterTitle}>第{chapter.sortOrder + 1}章 {chapter.title}</span>
          <Tag color={statusTag.color}>{statusTag.text}</Tag>
        </div>
        <div className={styles.headerRight}>
          <Button icon={<EditOutlined />} onClick={() => zone.setView({ type: "chapter-form", volumeId, chapterId })}>编辑章纲</Button>
          <Button type="primary" icon={<FileTextOutlined />} onClick={() => zone.setView({ type: "content-editor", volumeId, chapterId })}>写正文</Button>
        </div>
      </div>

      {chapter.summary && (
        <Card title="情节概要" color="accent">
          {chapter.summary}
        </Card>
      )}

      {chapter.scenes.length > 0 && (
        <Card title="场景设定" color="accent">
          <TagList items={chapter.scenes} color="blue" />
        </Card>
      )}

      {chapter.characters.length > 0 && (
        <Card title="出场人物" color="jade">
          <TagList items={chapter.characters} color="green" />
        </Card>
      )}

      {chapter.keyEvents.length > 0 && (
        <Card title="重大事件" color="accent">
          {chapter.keyEvents.map((ev, i) => (
            <div key={i} className={styles.listItem}>
              <span className={styles.listItemDot}>●</span> {ev}
            </div>
          ))}
        </Card>
      )}

      {chapter.foreshadowings.length > 0 && (
        <Card title="伏笔铺设" color="gold">
          {chapter.foreshadowings.map((f, i) => (
            <div key={i} className={styles.listItem}>
              <span className={styles.listItemDiamond}>◆</span> {f}
            </div>
          ))}
        </Card>
      )}

      {chapter.highlights && (
        <Card title="预计看点" color="jade">
          <div className={styles.highlightsText}>{chapter.highlights}</div>
        </Card>
      )}

      <div className={styles.footerMeta}>
        <div className={styles.metaLabel}>预计字数：<span className={styles.metaValue}>{chapter.expectedWords}</span></div>
        {chapter.note && (
          <div className={styles.metaLabel}>备注：<span className={styles.metaValue}>{chapter.note}</span></div>
        )}
      </div>

      {chapter.content && (
        <Card title="已写正文" color="ink">
          <pre className={styles.contentPre}>
            {chapter.content}
          </pre>
        </Card>
      )}
    </div>
  );
}

function Card({ title, color, children }: { title: string; color: "accent" | "jade" | "gold" | "ink"; children: ReactNode }) {
  const colorVar = `var(--${color === "ink" ? "ink-secondary" : color})`;
  return (
    <div className={styles.card} style={{ borderLeft: `3px solid ${colorVar}` }}>
      <div className={styles.cardTitle} style={{ color: colorVar }}>{title}</div>
      {children}
    </div>
  );
}

function TagList({ items, color }: { items: string[]; color: string }) {
  return (
    <div className={styles.tagList}>
      {items.map((it, i) => <Tag key={i} color={color}>{it}</Tag>)}
    </div>
  );
}
