"use client";

import { useState, useMemo, useCallback } from "react";
import { Input, Button } from "antd";
import { StarOutlined } from "@ant-design/icons";
import { showError, showSuccess } from "@/app/utils/error-handler";
import type { CreationZoneState } from "@/app/pages/books/hooks/use-creation-zone";
import type { BookOutline, ChapterOutline, VolumeOutline } from "@/app/types";
import styles from "./index.module.css";

const { TextArea } = Input;

interface Props {
  bookId: string;
  zone: CreationZoneState;
}

export function CenterContent({ bookId, zone }: Props) {
  const { view, outline, volumes, chaptersMap, saveChapter, saveOutline, setView } = zone;

  // Section collapse state
  const [chapterSectionOpen, setChapterSectionOpen] = useState(true);
  const [contentSectionOpen, setContentSectionOpen] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Get current chapter/volume info
  const currentChapter = useMemo(() => {
    if (view.type === "content-editor" || view.type === "chapter-form") {
      return chaptersMap[view.volumeId]?.find((c) => c.id === view.chapterId);
    }
    return null;
  }, [view, chaptersMap]);

  const currentVolume = useMemo(() => {
    if (view.type === "content-editor" || view.type === "chapter-form") {
      return volumes.find((v) => v.id === view.volumeId);
    }
    return null;
  }, [view, volumes]);

  const wordCount = useMemo(() => {
    if (!currentChapter?.content) return 0;
    return currentChapter.content.replace(/\s/g, "").length;
  }, [currentChapter?.content]);

  const statusLabel = useMemo(() => {
    if (!currentChapter) return null;
    if (currentChapter.status === "done") return { text: "已通过", className: styles.statusDone };
    if (currentChapter.status === "writing") return { text: "撰写中", className: styles.statusWriting };
    if (currentChapter.summary) return { text: "已规划", className: styles.statusPlanned };
    return { text: "待规划", className: styles.statusEmpty };
  }, [currentChapter]);

  return (
    <div className={styles.container}>
      {/* ─── Outline View ─── */}
      {view.type === "outline" && (
        <>
          <div className={styles.toolbar}>
            <div className={styles.toolbarLeft}>
              <span className={styles.breadcrumb}>
                <span className={styles.breadcrumbCurrent}>总纲</span>
              </span>
            </div>
          </div>
          <div className={styles.body}>
            <OutlineFormView
              outline={outline}
              onSave={saveOutline}
            />
          </div>
        </>
      )}

      {/* ─── Volume Form View ─── */}
      {view.type === "volume-form" && (
        <>
          <div className={styles.toolbar}>
            <div className={styles.toolbarLeft}>
              <span className={styles.breadcrumb}>
                <span className={styles.breadcrumbCurrent}>
                  {view.volumeId ? (volumes.find((v) => v.id === view.volumeId)?.title ?? "编辑卷纲") : "新建卷"}
                </span>
              </span>
            </div>
          </div>
          <div className={styles.body}>
            <VolumeFormView
              volumeId={view.volumeId}
              volumes={volumes}
              outline={outline}
              onSave={zone.saveVolume}
              onCreated={(newVol) => {
                setView({ type: "volume-form", volumeId: newVol.id });
              }}
            />
          </div>
        </>
      )}

      {/* ─── Chapter Views ─── */}
      {(view.type === "content-editor" || view.type === "chapter-form") && currentChapter && currentVolume ? (
        <>
          {/* Toolbar */}
          <div className={styles.toolbar}>
            <div className={styles.toolbarLeft}>
              <span className={styles.breadcrumb}>
                {currentVolume.title}
                <span className={styles.breadcrumbSep}>›</span>
                <span className={styles.breadcrumbCurrent}>
                  第{currentChapter.sortOrder + 1}章 {currentChapter.title}
                </span>
              </span>
              <span className={styles.toolbarDot} />
              {statusLabel && (
                <span className={`${styles.statusTag} ${statusLabel.className}`}>
                  {statusLabel.text}
                </span>
              )}
            </div>
            <div className={styles.toolbarRight}>
              <span className={styles.wordCount}>{wordCount.toLocaleString()} 字</span>
              <Button
                type="primary"
                size="small"
                icon={<StarOutlined />}
                className={styles.aiBtn}
              >
                AI
              </Button>
            </div>
          </div>

          {/* Scrollable body */}
          <div className={styles.body}>
            {/* Chapter Outline Section */}
            <div className={styles.section}>
              <button
                className={styles.sectionHeader}
                onClick={() => setChapterSectionOpen(!chapterSectionOpen)}
              >
                <span className={styles.sectionTitle}>章纲</span>
                <span className={`${styles.sectionArrow} ${chapterSectionOpen ? styles.sectionArrowOpen : ""}`}>
                  ▾
                </span>
              </button>
              {chapterSectionOpen && (
                <div className={styles.sectionBody}>
                  <ChapterOutlineView
                    chapter={currentChapter}
                    volumeId={view.volumeId}
                    detailsOpen={detailsOpen}
                    setDetailsOpen={setDetailsOpen}
                    onSave={saveChapter}
                  />
                </div>
              )}
            </div>

            {/* Content Section */}
            <div className={styles.section}>
              <button
                className={styles.sectionHeader}
                onClick={() => setContentSectionOpen(!contentSectionOpen)}
              >
                <span className={styles.sectionTitle}>正文</span>
                {wordCount > 0 && (
                  <span className={styles.sectionBadge}>{wordCount.toLocaleString()} 字</span>
                )}
                <span className={`${styles.sectionArrow} ${contentSectionOpen ? styles.sectionArrowOpen : ""}`}>
                  ▾
                </span>
              </button>
              {contentSectionOpen && (
                <div className={styles.sectionBody}>
                  <ContentView
                    chapter={currentChapter}
                    onSave={zone.saveChapterContent}
                  />
                </div>
              )}
            </div>
          </div>
        </>
      ) : view.type === "empty" || view.type === "outline" || view.type === "volume-form" ? null : (
        <EmptyView />
      )}
    </div>
  );
}

/* ─── Outline Form View (总纲编辑 — 可折叠 + 吸顶) ─── */
function OutlineFormView({
  outline,
  onSave,
}: {
  outline: BookOutline | null;
  onSave: (data: { direction: string; stages: string; sellingPoints: string }) => Promise<BookOutline | null>;
}) {
  const [direction, setDirection] = useState(outline?.direction ?? "");
  const [stages, setStages] = useState(outline?.stages ?? "");
  const [sellingPoints, setSellingPoints] = useState(outline?.sellingPoints ?? "");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["direction", "stages", "sellingPoints"]));

  const toggle = useCallback((key: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    setSaveStatus("saving");
    try {
      await onSave({ direction, stages, sellingPoints });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("idle");
    }
  }, [direction, stages, sellingPoints, onSave]);

  return (
    <div className={styles.outlineContainer}>
      {/* Hint */}
      <div className={styles.outlineHintCard}>
        <span className={styles.outlineHintIcon}>💡</span>
        <span className={styles.outlineHintText}>
          总纲保持模糊，随写作推进逐步细化。只写方向，不写细节。
        </span>
      </div>

      {/* Direction */}
      <div className={styles.outlineSection}>
        <button className={styles.outlineSectionHeader} onClick={() => toggle("direction")}>
          <span className={styles.outlineSectionNum}>01</span>
          <span className={styles.outlineSectionTitle}>整体方向</span>
          <span className={styles.outlineSectionMeta}>{direction.length} 字</span>
          <span className={`${styles.outlineSectionArrow} ${openSections.has("direction") ? styles.outlineSectionArrowOpen : ""}`}>▾</span>
        </button>
        {openSections.has("direction") && (
          <div className={styles.outlineSectionBody}>
            <textarea
              className={styles.outlineSectionTextarea}
              value={direction}
              onChange={(e) => setDirection(e.target.value)}
              onBlur={handleSave}
              rows={4}
              placeholder="故事的核心方向是什么？主角要走向哪里？"
            />
            <div className={styles.outlineSectionFooter}>
              <span className={styles.outlineSectionHint}>一句话概括这本书要讲什么</span>
            </div>
          </div>
        )}
      </div>

      {/* Stages */}
      <div className={styles.outlineSection}>
        <button className={styles.outlineSectionHeader} onClick={() => toggle("stages")}>
          <span className={styles.outlineSectionNum}>02</span>
          <span className={styles.outlineSectionTitle}>阶段划分</span>
          <span className={styles.outlineSectionMeta}>{stages.length} 字</span>
          <span className={`${styles.outlineSectionArrow} ${openSections.has("stages") ? styles.outlineSectionArrowOpen : ""}`}>▾</span>
        </button>
        {openSections.has("stages") && (
          <div className={styles.outlineSectionBody}>
            <textarea
              className={styles.outlineSectionTextarea}
              value={stages}
              onChange={(e) => setStages(e.target.value)}
              onBlur={handleSave}
              rows={8}
              placeholder={"每行一个阶段，例如：\n第一阶段：少年入世，初窥修行\n第二阶段：拜师学艺，崭露头角\n第三阶段：卷入纷争，名动天下"}
            />
            <div className={styles.outlineSectionFooter}>
              <span className={styles.outlineSectionHint}>故事的大节奏，不需要细节</span>
            </div>
          </div>
        )}
      </div>

      {/* Selling Points */}
      <div className={styles.outlineSection}>
        <button className={styles.outlineSectionHeader} onClick={() => toggle("sellingPoints")}>
          <span className={styles.outlineSectionNum}>03</span>
          <span className={styles.outlineSectionTitle}>核心卖点</span>
          <span className={styles.outlineSectionMeta}>{sellingPoints.length} 字</span>
          <span className={`${styles.outlineSectionArrow} ${openSections.has("sellingPoints") ? styles.outlineSectionArrowOpen : ""}`}>▾</span>
        </button>
        {openSections.has("sellingPoints") && (
          <div className={styles.outlineSectionBody}>
            <textarea
              className={styles.outlineSectionTextarea}
              value={sellingPoints}
              onChange={(e) => setSellingPoints(e.target.value)}
              onBlur={handleSave}
              rows={3}
              placeholder="这本书最吸引读者的地方是什么？"
            />
            <div className={styles.outlineSectionFooter}>
              <span className={styles.outlineSectionHint}>用逗号分隔，2-5 个卖点</span>
            </div>
          </div>
        )}
      </div>

      {/* Save Status */}
      <div className={styles.outlineSaveBar}>
        <span className={`${styles.outlineSaveStatus} ${styles[`outlineSaveStatus_${saveStatus}`]}`}>
          {saveStatus === "saving" && "保存中..."}
          {saveStatus === "saved" && "已保存"}
        </span>
      </div>
    </div>
  );
}

/* ─── Volume Form View (卷纲编辑 — 可折叠 + 吸顶) ─── */
function VolumeFormView({
  volumeId,
  volumes,
  outline,
  onSave,
  onCreated,
}: {
  volumeId?: string;
  volumes: VolumeOutline[];
  outline: BookOutline | null;
  onSave: (data: { id?: string; title: string; coreConflict?: string; developmentArc?: string; highlights?: string }) => Promise<VolumeOutline | null>;
  onCreated?: (vol: VolumeOutline) => void;
}) {
  const volume = volumeId ? volumes.find((v) => v.id === volumeId) : undefined;

  const [title, setTitle] = useState(volume?.title ?? "");
  const [coreConflict, setCoreConflict] = useState(volume?.coreConflict ?? "");
  const [developmentArc, setDevelopmentArc] = useState(volume?.developmentArc ?? "");
  const [highlights, setHighlights] = useState(volume?.highlights ?? "");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["title", "coreConflict", "developmentArc", "highlights"]));

  const toggle = useCallback((key: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!title.trim()) return;
    setSaveStatus("saving");
    try {
      const result = await onSave({ id: volume?.id, title, coreConflict, developmentArc, highlights });
      if (result) {
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
        if (!volume && onCreated) onCreated(result);
      } else {
        setSaveStatus("idle");
      }
    } catch {
      setSaveStatus("idle");
    }
  }, [volume, title, coreConflict, developmentArc, highlights, onSave, onCreated]);

  return (
    <div className={styles.outlineContainer}>
      {/* Hint */}
      <div className={styles.outlineHintCard}>
        <span className={styles.outlineHintIcon}>💡</span>
        <span className={styles.outlineHintText}>
          卷纲定义本卷的核心矛盾和发展方向。AI 可根据总纲自动生成。
        </span>
      </div>

      {/* Title */}
      <div className={styles.outlineSection}>
        <button className={styles.outlineSectionHeader} onClick={() => toggle("title")}>
          <span className={styles.outlineSectionNum}>01</span>
          <span className={styles.outlineSectionTitle}>卷标题</span>
          <span className={styles.outlineSectionMeta}>{title.length} 字</span>
          <span className={`${styles.outlineSectionArrow} ${openSections.has("title") ? styles.outlineSectionArrowOpen : ""}`}>▾</span>
        </button>
        {openSections.has("title") && (
          <div className={styles.outlineSectionBody}>
            <input
              className={styles.outlineSectionInput}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleSave}
              placeholder="第一卷 · 标题"
            />
          </div>
        )}
      </div>

      {/* Core Conflict */}
      <div className={styles.outlineSection}>
        <button className={styles.outlineSectionHeader} onClick={() => toggle("coreConflict")}>
          <span className={styles.outlineSectionNum}>02</span>
          <span className={styles.outlineSectionTitle}>核心冲突</span>
          <span className={styles.outlineSectionMeta}>{coreConflict.length} 字</span>
          <span className={`${styles.outlineSectionArrow} ${openSections.has("coreConflict") ? styles.outlineSectionArrowOpen : ""}`}>▾</span>
        </button>
        {openSections.has("coreConflict") && (
          <div className={styles.outlineSectionBody}>
            <textarea
              className={styles.outlineSectionTextarea}
              value={coreConflict}
              onChange={(e) => setCoreConflict(e.target.value)}
              onBlur={handleSave}
              rows={4}
              placeholder="本卷的核心矛盾是什么？主角面临什么挑战？"
            />
            <div className={styles.outlineSectionFooter}>
              <span className={styles.outlineSectionHint}>推动本卷情节发展的核心动力</span>
            </div>
          </div>
        )}
      </div>

      {/* Development Arc */}
      <div className={styles.outlineSection}>
        <button className={styles.outlineSectionHeader} onClick={() => toggle("developmentArc")}>
          <span className={styles.outlineSectionNum}>03</span>
          <span className={styles.outlineSectionTitle}>发展弧线</span>
          <span className={styles.outlineSectionMeta}>{developmentArc.length} 字</span>
          <span className={`${styles.outlineSectionArrow} ${openSections.has("developmentArc") ? styles.outlineSectionArrowOpen : ""}`}>▾</span>
        </button>
        {openSections.has("developmentArc") && (
          <div className={styles.outlineSectionBody}>
            <textarea
              className={styles.outlineSectionTextarea}
              value={developmentArc}
              onChange={(e) => setDevelopmentArc(e.target.value)}
              onBlur={handleSave}
              rows={4}
              placeholder="情节发展走向"
            />
            <div className={styles.outlineSectionFooter}>
              <span className={styles.outlineSectionHint}>从开始到结束的情绪和节奏变化</span>
            </div>
          </div>
        )}
      </div>

      {/* Highlights */}
      <div className={styles.outlineSection}>
        <button className={styles.outlineSectionHeader} onClick={() => toggle("highlights")}>
          <span className={styles.outlineSectionNum}>04</span>
          <span className={styles.outlineSectionTitle}>预计看点</span>
          <span className={styles.outlineSectionMeta}>{highlights.length} 字</span>
          <span className={`${styles.outlineSectionArrow} ${openSections.has("highlights") ? styles.outlineSectionArrowOpen : ""}`}>▾</span>
        </button>
        {openSections.has("highlights") && (
          <div className={styles.outlineSectionBody}>
            <textarea
              className={styles.outlineSectionTextarea}
              value={highlights}
              onChange={(e) => setHighlights(e.target.value)}
              onBlur={handleSave}
              rows={3}
              placeholder="吸引读者继续阅读的钩子"
            />
            <div className={styles.outlineSectionFooter}>
              <span className={styles.outlineSectionHint}>本卷最让读者期待的部分</span>
            </div>
          </div>
        )}
      </div>

      {/* Save Status */}
      <div className={styles.outlineSaveBar}>
        <span className={`${styles.outlineSaveStatus} ${styles[`outlineSaveStatus_${saveStatus}`]}`}>
          {saveStatus === "saving" && "保存中..."}
          {saveStatus === "saved" && "已保存"}
        </span>
      </div>
    </div>
  );
}

/* ─── Chapter Outline View (inline form) ─── */
function ChapterOutlineView({
  chapter,
  volumeId,
  detailsOpen,
  setDetailsOpen,
  onSave,
}: {
  chapter: ChapterOutline;
  volumeId: string;
  detailsOpen: boolean;
  setDetailsOpen: (v: boolean) => void;
  onSave: (volumeId: string, data: { id?: string; title: string; summary?: string; prevChapterLink?: string; nextChapterSuspense?: string; scenes?: string[]; time?: string; moodTone?: string; characters?: string[]; keyEvents?: string[]; foreshadowings?: string[]; highlights?: string; expectedWords?: number; note?: string }) => Promise<ChapterOutline | null>;
}) {
  const [title, setTitle] = useState(chapter.title);
  const [summary, setSummary] = useState(chapter.summary);
  const [prevLink, setPrevLink] = useState(chapter.prevChapterLink);
  const [nextSuspense, setNextSuspense] = useState(chapter.nextChapterSuspense);
  const [scenes, setScenes] = useState<string[]>(chapter.scenes || []);
  const [characters, setCharacters] = useState<string[]>(chapter.characters || []);
  const [keyEvents, setKeyEvents] = useState<string[]>(chapter.keyEvents || []);
  const [foreshadowings, setForeshadowings] = useState<string[]>(chapter.foreshadowings || []);
  const [expectedWords, setExpectedWords] = useState(chapter.expectedWords || 3000);
  const [time, setTime] = useState(chapter.time || "");
  const [moodTone, setMoodTone] = useState(chapter.moodTone || "");

  const handleSave = useCallback(async () => {
    if (!title.trim()) return;
    await onSave(volumeId, {
      id: chapter.id,
      title, summary, prevChapterLink: prevLink,
      nextChapterSuspense: nextSuspense, scenes, characters,
      keyEvents, foreshadowings, expectedWords, time, moodTone,
    });
    showSuccess("章纲已保存");
  }, [volumeId, chapter.id, title, summary, prevLink, nextSuspense, scenes, characters, keyEvents, foreshadowings, expectedWords, time, moodTone, onSave]);

  const handleBlur = useCallback(() => { void handleSave(); }, [handleSave]);

  return (
    <div className={styles.outlineForm}>
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>章标题</label>
        <input
          className={styles.formInput}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleBlur}
          placeholder="第X章 · 标题"
        />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>情节概要</label>
        <textarea
          className={styles.formTextarea}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          onBlur={handleBlur}
          rows={3}
          placeholder="本章核心情节描述"
        />
      </div>
      <div className={styles.formRow}>
        <div className={styles.formCol}>
          <label className={styles.formLabel}>前文衔接</label>
          <input
            className={styles.formInput}
            value={prevLink}
            onChange={(e) => setPrevLink(e.target.value)}
            onBlur={handleBlur}
            placeholder="与上一章的衔接点"
          />
        </div>
        <div className={styles.formCol}>
          <label className={styles.formLabel}>后文悬念</label>
          <input
            className={styles.formInput}
            value={nextSuspense}
            onChange={(e) => setNextSuspense(e.target.value)}
            onBlur={handleBlur}
            placeholder="留给读者的悬念？"
          />
        </div>
      </div>
      <div className={styles.formDivider} />
      <TagList label="出场人物" items={characters} onChange={setCharacters} onBlur={handleBlur} />
      <TagList label="场景" items={scenes} onChange={setScenes} onBlur={handleBlur} />
      <TagList label="关键事件" items={keyEvents} onChange={setKeyEvents} onBlur={handleBlur} />
      <TagList label="伏笔" items={foreshadowings} onChange={setForeshadowings} onBlur={handleBlur} />
      <div className={styles.collapseToggle} onClick={() => setDetailsOpen(!detailsOpen)}>
        <span>更多细节</span>
        <span className={`${styles.collapseArrow} ${detailsOpen ? styles.collapseArrowOpen : ""}`}>▾</span>
      </div>
      {detailsOpen && (
        <div className={styles.formRow} style={{ marginTop: 8 }}>
          <div className={styles.formCol}>
            <label className={styles.formLabel}>预计字数</label>
            <input
              className={styles.formInput}
              type="number"
              value={expectedWords}
              onChange={(e) => setExpectedWords(Number(e.target.value))}
              onBlur={handleBlur}
              style={{ fontFamily: "var(--font-mono)" }}
            />
          </div>
          <div className={styles.formCol}>
            <label className={styles.formLabel}>时间</label>
            <input
              className={styles.formInput}
              value={time}
              onChange={(e) => setTime(e.target.value)}
              onBlur={handleBlur}
              placeholder="深夜"
            />
          </div>
          <div className={styles.formCol}>
            <label className={styles.formLabel}>氛围</label>
            <input
              className={styles.formInput}
              value={moodTone}
              onChange={(e) => setMoodTone(e.target.value)}
              onBlur={handleBlur}
              placeholder="紧张、悬疑"
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Tag List ─── */
function TagList({
  label, items, onChange, onBlur,
}: {
  label: string; items: string[];
  onChange: (items: string[]) => void; onBlur?: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newVal, setNewVal] = useState("");

  const handleAdd = () => {
    if (newVal.trim()) {
      onChange([...items, newVal.trim()]);
      setNewVal("");
      onBlur?.();
    }
    setAdding(false);
  };

  return (
    <div className={styles.formGroup}>
      <label className={styles.formLabel}>{label}</label>
      <div className={styles.tagList}>
        {items.map((it, i) => (
          <span key={i} className={styles.tag}>
            {it}
            <span
              className={styles.tagRemove}
              onClick={() => {
                onChange(items.filter((_, idx) => idx !== i));
                onBlur?.();
              }}
            >
              ×
            </span>
          </span>
        ))}
        {adding ? (
          <input
            className={styles.tagInput}
            value={newVal}
            onChange={(e) => setNewVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
              if (e.key === "Escape") setAdding(false);
            }}
            onBlur={handleAdd}
            autoFocus
            placeholder="输入后回车"
          />
        ) : (
          <span className={styles.tagAdd} onClick={() => setAdding(true)}>+</span>
        )}
      </div>
    </div>
  );
}

/* ─── Content Reader/Editor View ─── */
function ContentView({
  chapter,
  onSave,
}: {
  chapter: ChapterOutline;
  onSave: (chapterId: string, content: string, status?: "planned" | "writing" | "done") => Promise<ChapterOutline | null>;
}) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(chapter.content || "");
  const [saving, setSaving] = useState(false);

  const wordCount = content.replace(/\s/g, "").length;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(chapter.id, content);
      showSuccess("正文已保存");
      setEditing(false);
    } catch {
      showError("保存失败");
    } finally {
      setSaving(false);
    }
  };

  if (!chapter.content && !editing) {
    return (
      <div className={styles.emptyContent}>
        <div className={styles.emptyContentIcon}>📄</div>
        <div className={styles.emptyContentTitle}>正文尚未生成</div>
        <div className={styles.emptyContentHint}>点击工具栏「AI」按钮生成正文</div>
      </div>
    );
  }

  if (editing) {
    return (
      <div className={styles.contentEdit}>
        <div className={styles.contentMeta}>
          <span className={styles.contentMetaText}>编辑中 · {wordCount} 字</span>
          <div className={styles.contentMetaActions}>
            <Button size="small" onClick={() => { setContent(chapter.content || ""); setEditing(false); }}>取消</Button>
            <Button size="small" type="primary" loading={saving} onClick={handleSave}>保存</Button>
          </div>
        </div>
        <TextArea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className={styles.contentTextArea}
          autoSize={{ minRows: 12 }}
        />
      </div>
    );
  }

  return (
    <div className={styles.contentRead}>
      <div className={styles.contentMeta}>
        <span className={styles.contentMetaText}>上次保存 · {wordCount} 字</span>
        <Button size="small" onClick={() => setEditing(true)}>编辑</Button>
      </div>
      <div className={styles.contentText}>
        {(chapter.content || "").split(/\n+/).filter(Boolean).map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </div>
  );
}

/* ─── Empty View ─── */
function EmptyView() {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>📖</div>
      <h3 className={styles.emptyTitle}>开始你的创作</h3>
      <p className={styles.emptyDesc}>
        从左侧导航树选择章节开始编辑，<br />
        或新建一卷来组织你的故事。
      </p>
    </div>
  );
}
