"use client";

import { useState } from "react";
import { Button, Input, InputNumber, Tag, message } from "antd";
import { DeleteOutlined, MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { SaveButton } from "@/shared/ui/save-button";
import type { ChapterOutline } from "@/app/types";

const { TextArea } = Input;

const STATUS_MAP: Record<string, { color: string; text: string }> = {
  planned: { color: "default", text: "草稿" },
  writing: { color: "gold", text: "已生成正文" },
  done: { color: "green", text: "已过审" },
};

interface Props {
  volumeId: string;
  chapter?: ChapterOutline;
  onSave: (data: {
    id?: string;
    title: string;
    summary?: string;
    prevChapterLink?: string;
    nextChapterSuspense?: string;
    scenes?: string[];
    time?: string;
    moodTone?: string;
    characters?: string[];
    keyEvents?: string[];
    foreshadowings?: string[];
    highlights?: string;
    expectedWords?: number;
    note?: string;
  }) => Promise<ChapterOutline | null>;
  onCancel: () => void;
  onDelete?: (volumeId: string, chapterId: string) => Promise<boolean>;
}

export function ChapterForm({ volumeId, chapter, onSave, onCancel, onDelete }: Props) {
  const [title, setTitle] = useState(chapter?.title ?? "");
  const [summary, setSummary] = useState(chapter?.summary ?? "");
  const [prevChapterLink, setPrevChapterLink] = useState(chapter?.prevChapterLink ?? "");
  const [nextChapterSuspense, setNextChapterSuspense] = useState(chapter?.nextChapterSuspense ?? "");
  const [expectedWords, setExpectedWords] = useState(chapter?.expectedWords ?? 3000);
  const [note, setNote] = useState(chapter?.note ?? "");

  const [scenes, setScenes] = useState<string[]>(chapter?.scenes ?? []);
  const [time, setTime] = useState(chapter?.time ?? "");
  const [moodTone, setMoodTone] = useState(chapter?.moodTone ?? "");
  const [characters, setCharacters] = useState<string[]>(chapter?.characters ?? []);
  const [keyEvents, setKeyEvents] = useState<string[]>(chapter?.keyEvents ?? []);
  const [foreshadowings, setForeshadowings] = useState<string[]>(chapter?.foreshadowings ?? []);
  const [highlights, setHighlights] = useState(chapter?.highlights ?? "");

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const statusInfo = chapter?.status ? STATUS_MAP[chapter.status] : null;

  const handleSave = async () => {
    if (!title.trim()) {
      message.warning("请输入章节标题");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        id: chapter?.id,
        title,
        summary,
        prevChapterLink,
        nextChapterSuspense,
        scenes,
        time,
        moodTone,
        characters,
        keyEvents,
        foreshadowings,
        highlights,
        expectedWords,
        note,
      });
      message.success(chapter ? "章纲已更新" : "章纲已创建");
    } catch {
      message.error("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!chapter?.id || !onDelete) return;
    setDeleting(true);
    try {
      await onDelete(volumeId, chapter.id);
      message.success("章纲已删除");
    } catch {
      message.error("删除失败");
      setDeleting(false);
    }
  };

  const renderArrayInput = (label: string, items: string[], setItems: (v: string[]) => void, placeholder?: string) => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontWeight: 600, fontSize: 12, color: "var(--ink-secondary)", marginBottom: 6 }}>{label}</label>
      {items.map((it, i) => (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <Input value={it} placeholder={placeholder} maxLength={200} showCount onChange={(e) => { const next = [...items]; next[i] = e.target.value; setItems(next); }} />
          <Button icon={<MinusCircleOutlined />} onClick={() => setItems(items.filter((_, idx) => idx !== i))} />
        </div>
      ))}
      <Button type="dashed" icon={<PlusOutlined />} onClick={() => setItems([...items, ""])}>添加</Button>
    </div>
  );

  return (
    <div style={{ padding: 24, maxWidth: 700, height: "100%", overflowY: "auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h3 style={{ fontFamily: "var(--font-display)", color: "var(--text)", margin: 0 }}>
            {chapter ? "编辑章纲" : "新建章纲"}
          </h3>
          {statusInfo && <Tag color={statusInfo.color}>{statusInfo.text}</Tag>}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {chapter?.id && onDelete && (
            <Button danger icon={<DeleteOutlined />} loading={deleting} onClick={handleDelete}>删除</Button>
          )}
          <SaveButton loading={saving} onClick={handleSave} />
        </div>
      </div>

      {/* Row 1: 章节标题 + 目标字数 */}
      <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
        <div style={{ flex: 2 }}>
          <label style={{ display: "block", fontWeight: 600, fontSize: 12, color: "var(--ink-secondary)", marginBottom: 6 }}>章节标题</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="如：意外发现" maxLength={60} showCount />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: "block", fontWeight: 600, fontSize: 12, color: "var(--ink-secondary)", marginBottom: 6 }}>目标字数</label>
          <InputNumber value={expectedWords} onChange={(v) => setExpectedWords(v ?? 3000)} min={100} max={50000} step={500} style={{ width: "100%" }} />
        </div>
      </div>

      {/* Row 2: 前章衔接 + 下章悬念 */}
      <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: "block", fontWeight: 600, fontSize: 12, color: "var(--ink-secondary)", marginBottom: 6 }}>前章衔接</label>
          <TextArea value={prevChapterLink} onChange={(e) => setPrevChapterLink(e.target.value)} rows={2} placeholder="与上一章的衔接要点" maxLength={2000} showCount />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: "block", fontWeight: 600, fontSize: 12, color: "var(--ink-secondary)", marginBottom: 6 }}>下章悬念</label>
          <TextArea value={nextChapterSuspense} onChange={(e) => setNextChapterSuspense(e.target.value)} rows={2} placeholder="为下一章留的悬念" maxLength={2000} showCount />
        </div>
      </div>

      {/* 情节摘要 */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontWeight: 600, fontSize: 12, color: "var(--ink-secondary)", marginBottom: 6 }}>情节摘要</label>
        <TextArea value={summary} onChange={(e) => setSummary(e.target.value)} rows={4} placeholder="本章主要情节" maxLength={10000} showCount />
      </div>

      {/* 补充说明 */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontWeight: 600, fontSize: 12, color: "var(--ink-secondary)", marginBottom: 6 }}>补充说明</label>
        <TextArea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="写作时的注意事项" maxLength={2000} showCount />
      </div>

      {/* 折叠区域 */}
      <div style={{ marginBottom: 16 }}>
        <div
          onClick={() => setDetailsOpen(!detailsOpen)}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 0", cursor: "pointer", color: "var(--ink-secondary)", fontSize: 13, userSelect: "none" }}
        >
          <span style={{ display: "inline-block", transform: detailsOpen ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}>▸</span>
          更多细节 — 场景·人物·事件·伏笔·看点
        </div>

        {detailsOpen && (
          <div style={{ paddingLeft: 16, borderLeft: "2px solid var(--line)", marginLeft: 6 }}>
            {renderArrayInput("场景", scenes, setScenes, "场景描述")}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontWeight: 600, fontSize: 12, color: "var(--ink-secondary)", marginBottom: 6 }}>时间</label>
              <Input value={time} onChange={(e) => setTime(e.target.value)} placeholder="如：第三天下午" maxLength={200} showCount />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontWeight: 600, fontSize: 12, color: "var(--ink-secondary)", marginBottom: 6 }}>情绪基调</label>
              <Input value={moodTone} onChange={(e) => setMoodTone(e.target.value)} placeholder="如：紧张、悬疑" maxLength={200} showCount />
            </div>
            {renderArrayInput("出场人物", characters, setCharacters, "人物名称")}
            {renderArrayInput("重大事件", keyEvents, setKeyEvents, "事件描述")}
            {renderArrayInput("伏笔", foreshadowings, setForeshadowings, "伏笔内容")}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontWeight: 600, fontSize: 12, color: "var(--ink-secondary)", marginBottom: 6 }}>预计看点</label>
              <Input value={highlights} onChange={(e) => setHighlights(e.target.value)} placeholder="本章的爽点或看点" maxLength={200} showCount />
            </div>
          </div>
        )}
      </div>

      <Button onClick={onCancel}>返回</Button>
    </div>
  );
}
