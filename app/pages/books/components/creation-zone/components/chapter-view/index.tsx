"use client";

import type { ReactNode } from "react";
import { Button, Tag, Empty } from "antd";
import { EditOutlined, FileTextOutlined } from "@ant-design/icons";
import type { CreationZoneState } from "@/app/pages/books/hooks/use-creation-zone";

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
    <div style={{ padding: 24, height: "100%", overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 14, color: "var(--text)" }}>第{chapter.sortOrder + 1}章 {chapter.title}</span>
          <Tag color={statusTag.color}>{statusTag.text}</Tag>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
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
            <div key={i} style={{ fontSize: 13, color: "var(--text)", marginBottom: 4 }}>
              <span style={{ color: "var(--accent)" }}>●</span> {ev}
            </div>
          ))}
        </Card>
      )}

      {chapter.foreshadowings.length > 0 && (
        <Card title="伏笔铺设" color="gold">
          {chapter.foreshadowings.map((f, i) => (
            <div key={i} style={{ fontSize: 13, color: "var(--text)", marginBottom: 4 }}>
              <span style={{ color: "var(--gold)" }}>◆</span> {f}
            </div>
          ))}
        </Card>
      )}

      {chapter.highlights && (
        <Card title="预计看点" color="jade">
          <div style={{ fontSize: 13, lineHeight: 1.8, color: "var(--text)" }}>{chapter.highlights}</div>
        </Card>
      )}

      <div style={{ display: "flex", gap: 24, marginTop: 8 }}>
        <div style={{ fontSize: 12, color: "var(--ink-tertiary)" }}>预计字数：<span style={{ color: "var(--text)" }}>{chapter.expectedWords}</span></div>
        {chapter.note && (
          <div style={{ fontSize: 12, color: "var(--ink-tertiary)" }}>备注：<span style={{ color: "var(--text)" }}>{chapter.note}</span></div>
        )}
      </div>

      {chapter.content && (
        <Card title="已写正文" color="ink">
          <pre style={{ whiteSpace: "pre-wrap", fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-secondary)", maxHeight: 200, overflow: "auto", margin: 0 }}>
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
    <div style={{ background: "var(--panel-soft)", padding: 16, borderRadius: "var(--radius-md)", marginBottom: 16, borderLeft: `3px solid ${colorVar}` }}>
      <div style={{ fontWeight: 600, fontSize: 12, color: colorVar, marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

function TagList({ items, color }: { items: string[]; color: string }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {items.map((it, i) => <Tag key={i} color={color}>{it}</Tag>)}
    </div>
  );
}
