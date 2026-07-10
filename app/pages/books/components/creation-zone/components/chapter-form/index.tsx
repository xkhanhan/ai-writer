"use client";

import { useState } from "react";
import { Button, Input, InputNumber, Tag } from "antd";
import { showError, showSuccess, showWarning } from "@/app/utils/error-handler";
import { DeleteOutlined, MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { SaveButton } from "@/shared/ui/save-button";
import type { ChapterOutline } from "@/app/types";
import styles from "./index.module.css";

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
      showWarning("请输入章节标题");
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
      showSuccess(chapter ? "章纲已更新" : "章纲已创建");
    } catch {
      showError("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!chapter?.id || !onDelete) return;
    setDeleting(true);
    try {
      await onDelete(volumeId, chapter.id);
      showSuccess("章纲已删除");
    } catch {
      showError("删除失败");
    } finally {
      setDeleting(false);
    }
  };

  const renderArrayInput = (label: string, items: string[], setItems: (v: string[]) => void, placeholder?: string) => (
    <div className={styles.formRowField}>
      <label className={styles.formLabel}>{label}</label>
      {items.map((it, i) => (
        <div key={i} className={styles.arrayItemRow}>
          <Input value={it} placeholder={placeholder} maxLength={200} showCount onChange={(e) => { const next = [...items]; next[i] = e.target.value; setItems(next); }} />
          <Button icon={<MinusCircleOutlined />} onClick={() => setItems(items.filter((_, idx) => idx !== i))} />
        </div>
      ))}
      <Button type="dashed" icon={<PlusOutlined />} onClick={() => setItems([...items, ""])}>添加</Button>
    </div>
  );

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h3 className={styles.title}>
            {chapter ? "编辑章纲" : "新建章纲"}
          </h3>
          {statusInfo && <Tag color={statusInfo.color}>{statusInfo.text}</Tag>}
        </div>
        <div className={styles.headerRight}>
          {chapter?.id && onDelete && (
            <Button danger icon={<DeleteOutlined />} loading={deleting} onClick={handleDelete}>删除</Button>
          )}
          <SaveButton loading={saving} onClick={handleSave} />
        </div>
      </div>

      {/* Row 1: 章节标题 + 目标字数 */}
      <div className={styles.formRow}>
        <div className={styles.formRowFieldWide}>
          <label className={styles.formLabel}>章节标题</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="如：意外发现" maxLength={60} showCount />
        </div>
        <div className={styles.formRowFieldHalf}>
          <label className={styles.formLabel}>目标字数</label>
          <InputNumber value={expectedWords} onChange={(v) => setExpectedWords(v ?? 3000)} min={100} max={50000} step={500} style={{ width: "100%" }} />
        </div>
      </div>

      {/* Row 2: 前章衔接 + 下章悬念 */}
      <div className={styles.formRow}>
        <div className={styles.formRowFieldHalf}>
          <label className={styles.formLabel}>前章衔接</label>
          <TextArea value={prevChapterLink} onChange={(e) => setPrevChapterLink(e.target.value)} rows={2} placeholder="与上一章的衔接要点" maxLength={2000} showCount />
        </div>
        <div className={styles.formRowFieldHalf}>
          <label className={styles.formLabel}>下章悬念</label>
          <TextArea value={nextChapterSuspense} onChange={(e) => setNextChapterSuspense(e.target.value)} rows={2} placeholder="为下一章留的悬念" maxLength={2000} showCount />
        </div>
      </div>

      {/* 情节摘要 */}
      <div className={styles.formRowField}>
        <label className={styles.formLabel}>情节摘要</label>
        <TextArea value={summary} onChange={(e) => setSummary(e.target.value)} rows={4} placeholder="本章主要情节" maxLength={10000} showCount />
      </div>

      {/* 补充说明 */}
      <div className={styles.formRowField}>
        <label className={styles.formLabel}>补充说明</label>
        <TextArea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="写作时的注意事项" maxLength={2000} showCount />
      </div>

      {/* 折叠区域 */}
      <div className={styles.formRowField}>
        <div
          onClick={() => setDetailsOpen(!detailsOpen)}
          className={styles.detailsToggle}
        >
          <span className={`${styles.toggleArrow} ${detailsOpen ? styles.toggleArrowOpen : ""}`}>&#9656;</span>
          更多细节 — 场景·人物·事件·伏笔·看点
        </div>

        {detailsOpen && (
          <div className={styles.detailsBody}>
            {renderArrayInput("场景", scenes, setScenes, "场景描述")}
            <div className={styles.formRowField}>
              <label className={styles.formLabel}>时间</label>
              <Input value={time} onChange={(e) => setTime(e.target.value)} placeholder="如：第三天下午" maxLength={200} showCount />
            </div>
            <div className={styles.formRowField}>
              <label className={styles.formLabel}>情绪基调</label>
              <Input value={moodTone} onChange={(e) => setMoodTone(e.target.value)} placeholder="如：紧张、悬疑" maxLength={200} showCount />
            </div>
            {renderArrayInput("出场人物", characters, setCharacters, "人物名称")}
            {renderArrayInput("重大事件", keyEvents, setKeyEvents, "事件描述")}
            {renderArrayInput("伏笔", foreshadowings, setForeshadowings, "伏笔内容")}
            <div className={styles.formRowField}>
              <label className={styles.formLabel}>预计看点</label>
              <Input value={highlights} onChange={(e) => setHighlights(e.target.value)} placeholder="本章的爽点或看点" maxLength={200} showCount />
            </div>
          </div>
        )}
      </div>

      <Button onClick={onCancel}>返回</Button>
    </div>
  );
}
