"use client";

import { useState, useMemo, useCallback } from "react";
import { Button, Input, Tag } from "antd";
import { showError, showSuccess } from "@/app/utils/error-handler";
import { CheckCircleOutlined } from "@ant-design/icons";
import { SaveButton } from "@/shared/ui/save-button";
import { AiDropdown } from "@/shared/ui/ai-dropdown";
import { AiResultPanel, type AiFunctionKey } from "../ai-result-panel";
import { ReviewResultPanel, type ReviewConfirmData } from "@/app/pages/books/components/review-result-panel";
import type { CreationZoneState } from "@/app/pages/books/hooks/use-creation-zone";

const { TextArea } = Input;

interface Props {
  bookId: string;
  volumeId: string;
  chapterId: string;
  zone: CreationZoneState;
}

export function ContentEditor({ bookId, volumeId, chapterId, zone }: Props) {
  const chapter = zone.chaptersMap[volumeId]?.find((c) => c.id === chapterId);
  const [content, setContent] = useState(chapter?.content ?? "");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // AI result panel state
  const [aiPanelVisible, setAiPanelVisible] = useState(false);
  const [aiFunctionKey, setAiFunctionKey] = useState<AiFunctionKey>("content_generate");
  const [aiSelectedText, setAiSelectedText] = useState<string | undefined>(undefined);

  // Review result panel state
  const [reviewPanelVisible, setReviewPanelVisible] = useState(false);

  const wordCount = useMemo(() => content.replace(/\s/g, "").length, [content]);

  const handleSave = async (status?: "planned" | "writing" | "done") => {
    setSaving(true);
    try {
      await zone.saveChapterContent(chapterId, content, status ?? chapter?.status);
      showSuccess("正文已保存");
      setDirty(false);
    } catch {
      showError("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    setSaving(true);
    try {
      await zone.saveChapterContent(chapterId, content, "done");
      showSuccess("已过审");
      setDirty(false);
    } catch {
      showError("操作失败");
    } finally {
      setSaving(false);
    }
  };

  const getSelectedText = useCallback((): string | undefined => {
    const el = document.querySelector<HTMLTextAreaElement>("[data-ai-editor] textarea");
    if (!el) return undefined;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    if (start === end || start == null || end == null) return undefined;
    return content.slice(start, end);
  }, [content]);

  const openAiPanel = useCallback((key: AiFunctionKey) => {
    setAiFunctionKey(key);
    setAiSelectedText(key === "content_generate" ? undefined : getSelectedText() || content);
    setAiPanelVisible(true);
  }, [getSelectedText, content]);

  const handleAiAdopt = useCallback((generated: string) => {
    if (aiFunctionKey === "content_generate") {
      setContent(generated);
    } else {
      // For deslop/polish/expand: replace the selected text or replace all
      const el = document.querySelector<HTMLTextAreaElement>("[data-ai-editor] textarea");
      if (el) {
        const start = el.selectionStart;
        const end = el.selectionEnd;
        if (start != null && end != null && start !== end) {
          const newContent = content.slice(0, start) + generated + content.slice(end);
          setContent(newContent);
          setDirty(true);
        } else {
          setContent(generated);
          setDirty(true);
        }
      } else {
        setContent(generated);
        setDirty(true);
      }
    }
    setAiPanelVisible(false);
  }, [aiFunctionKey, content]);

  const handleReviewConfirm = useCallback((confirmData: ReviewConfirmData) => {
    // Log adopted data for now; future: write to fact/foreshadow/character stores
    console.log("Review adopted data:", confirmData);
    setReviewPanelVisible(false);
  }, []);

  if (!chapter) return <div style={{ padding: 24 }}>未找到章节</div>;

  const aiItems = [
    { key: "generate", label: "生成内容", onClick: () => openAiPanel("content_generate") },
    { key: "deslop", label: "去除AI味", onClick: () => openAiPanel("deslop") },
    { key: "polish", label: "润色", onClick: () => openAiPanel("polish") },
    { key: "expand", label: "扩写", onClick: () => openAiPanel("expand") },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderBottom: "1px solid var(--line)" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 14, color: "var(--text)" }}>第{chapter.sortOrder + 1}章 {chapter.title}</span>
          <Tag color="red">正文</Tag>
          {dirty && <Tag color="gold">未保存</Tag>}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <AiDropdown items={aiItems} />
          <Button size="small" onClick={() => setReviewPanelVisible(true)}>
            AI过审
          </Button>
          <SaveButton loading={saving} onClick={() => handleSave()} />
          <Button type="primary" icon={<CheckCircleOutlined />} loading={saving} onClick={handleApprove}>过审</Button>
        </div>
      </div>

      {chapter.summary && (
        <div style={{ padding: "8px 24px", background: "var(--panel-soft)", fontSize: 12, color: "var(--ink-tertiary)", borderLeft: "3px solid var(--accent)" }}>
          情节概要：{chapter.summary}
        </div>
      )}

      <div style={{ flex: 1, padding: 24, overflow: "hidden" }}>
        <TextArea
          data-ai-editor="true"
          value={content}
          onChange={(e) => { setContent(e.target.value); setDirty(true); }}
          style={{ height: "100%", resize: "none", fontFamily: "var(--font-body)", fontSize: 14, lineHeight: 1.8 }}
          placeholder="在此撰写正文..."
        />
      </div>

      <AiResultPanel
        visible={aiPanelVisible}
        functionKey={aiFunctionKey}
        bookId={bookId}
        chapterId={chapterId}
        selectedText={aiSelectedText}
        onAdopt={handleAiAdopt}
        onCancel={() => setAiPanelVisible(false)}
      />

      <ReviewResultPanel
        visible={reviewPanelVisible}
        bookId={bookId}
        chapterId={chapterId}
        onConfirm={handleReviewConfirm}
        onCancel={() => setReviewPanelVisible(false)}
      />

      <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 24px", borderTop: "1px solid var(--line)", fontSize: 12, color: "var(--ink-tertiary)" }}>
        <span>字数：{wordCount} / 预计 {chapter.expectedWords}</span>
        <span>目标完成度：{chapter.expectedWords > 0 ? Math.min(100, Math.round((wordCount / chapter.expectedWords) * 100)) : 0}%</span>
      </div>
    </div>
  );
}
