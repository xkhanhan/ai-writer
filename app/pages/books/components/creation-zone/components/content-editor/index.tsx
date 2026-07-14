"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Button, Input, Tag } from "antd";
import { showError, showSuccess } from "@/app/utils/error-handler";
import { CheckCircleOutlined } from "@ant-design/icons";
import { SaveButton } from "@/shared/ui/save-button";
import { AiDropdown } from "@/shared/ui/ai-dropdown";
import { AiResultPanel, type AiFunctionKey } from "../ai-result-panel";
import { ReviewResultPanel, type ReviewConfirmData } from "@/app/pages/books/components/review-result-panel";
import type { CreationZoneState } from "@/app/pages/books/hooks/use-creation-zone";
import { useEditorContext } from "@/app/pages/books/hooks/use-editor-context";
import styles from "./index.module.css";

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

  // Initialize editor context hook
  const { getSelectedText } = useEditorContext({
    content,
    chapterId,
    bookId,
    chapterTitle: chapter?.title || null,
    bookTitle: null, // Will be passed from parent if available
  });

  // Listen for AI adopt events from unified panel
  useEffect(() => {
    const handleAdoptResult = (event: CustomEvent) => {
      const { content: adoptedContent, mode } = event.detail;
      if (mode === "QUICK") {
        // For quick mode, replace content
        setContent(adoptedContent);
        setDirty(true);
        showSuccess("内容已采纳");
      }
    };

    window.addEventListener("ai-adopt-result", handleAdoptResult as EventListener);
    return () => {
      window.removeEventListener("ai-adopt-result", handleAdoptResult as EventListener);
    };
  }, []);

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

  const getSelectedTextFromEditor = useCallback((): string | undefined => {
    const selected = getSelectedText();
    return selected || undefined;
  }, [getSelectedText]);

  const openAiPanel = useCallback((key: AiFunctionKey) => {
    setAiFunctionKey(key);
    setAiSelectedText(key === "content_generate" ? undefined : getSelectedTextFromEditor() || content);
    setAiPanelVisible(true);
  }, [getSelectedTextFromEditor, content]);

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

  const handleReviewConfirm = useCallback((_confirmData: ReviewConfirmData) => {
    // TODO: write confirmed data to fact/foreshadow/character stores
    setReviewPanelVisible(false);
  }, []);

  if (!chapter) return <div className={styles.notFound}>未找到章节</div>;

  const aiItems = [
    { key: "generate", label: "生成内容", onClick: () => openAiPanel("content_generate") },
    { key: "deslop", label: "去除AI味", onClick: () => openAiPanel("deslop") },
    { key: "polish", label: "润色", onClick: () => openAiPanel("polish") },
    { key: "expand", label: "扩写", onClick: () => openAiPanel("expand") },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <span className={styles.chapterLabel}>第{chapter.sortOrder + 1}章 {chapter.title}</span>
          <Tag color="red">正文</Tag>
          {dirty && <Tag color="gold">未保存</Tag>}
        </div>
        <div className={styles.toolbarRight}>
          <AiDropdown items={aiItems} />
          <Button size="small" onClick={() => setReviewPanelVisible(true)}>
            AI过审
          </Button>
          <SaveButton loading={saving} onClick={() => handleSave()} />
          <Button type="primary" icon={<CheckCircleOutlined />} loading={saving} onClick={handleApprove}>过审</Button>
        </div>
      </div>

      {chapter.summary && (
        <div className={styles.summaryBar}>
          情节概要：{chapter.summary}
        </div>
      )}

      <div className={styles.editorArea}>
        <TextArea
          data-ai-editor="true"
          value={content}
          onChange={(e) => { setContent(e.target.value); setDirty(true); }}
          className={styles.textArea}
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

      <div className={styles.statusBar}>
        <span>字数：{wordCount} / 预计 {chapter.expectedWords}</span>
        <span>目标完成度：{chapter.expectedWords > 0 ? Math.min(100, Math.round((wordCount / chapter.expectedWords) * 100)) : 0}%</span>
      </div>
    </div>
  );
}
