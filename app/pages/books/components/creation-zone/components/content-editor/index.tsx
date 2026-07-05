"use client";

import { useState, useMemo } from "react";
import { Button, Input, Tag, message } from "antd";
import { CheckCircleOutlined } from "@ant-design/icons";
import { SaveButton } from "@/shared/ui/save-button";
import { AiDropdown } from "@/shared/ui/ai-dropdown";
import type { CreationZoneState } from "@/app/pages/books/hooks/use-creation-zone";

const { TextArea } = Input;

interface Props {
  volumeId: string;
  chapterId: string;
  zone: CreationZoneState;
}

export function ContentEditor({ volumeId, chapterId, zone }: Props) {
  const chapter = zone.chaptersMap[volumeId]?.find((c) => c.id === chapterId);
  const [content, setContent] = useState(chapter?.content ?? "");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [prevChapterId, setPrevChapterId] = useState(chapterId);

  if (chapterId !== prevChapterId) {
    setPrevChapterId(chapterId);
    setContent(chapter?.content ?? "");
    setDirty(false);
  }

  const wordCount = useMemo(() => content.replace(/\s/g, "").length, [content]);

  const handleSave = async (status?: string) => {
    setSaving(true);
    try {
      await zone.saveChapterContent(chapterId, content, status ?? chapter?.status);
      message.success("正文已保存");
      setDirty(false);
    } catch {
      message.error("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    setSaving(true);
    try {
      await zone.saveChapterContent(chapterId, content, "done");
      message.success("已过审");
      setDirty(false);
    } catch {
      message.error("操作失败");
    } finally {
      setSaving(false);
    }
  };

  if (!chapter) return <div style={{ padding: 24 }}>未找到章节</div>;

  const aiItems = [
    { key: "generate", label: "生成内容", onClick: () => message.info("AI 生成内容（待接入）") },
    { key: "deslop", label: "去除AI味", onClick: () => message.info("去除AI味（待接入）") },
    { key: "polish", label: "润色", onClick: () => message.info("润色（待接入）") },
    { key: "expand", label: "扩写", onClick: () => message.info("扩写（待接入）") },
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
          value={content}
          onChange={(e) => { setContent(e.target.value); setDirty(true); }}
          style={{ height: "100%", resize: "none", fontFamily: "var(--font-body)", fontSize: 14, lineHeight: 1.8 }}
          placeholder="在此撰写正文..."
        />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 24px", borderTop: "1px solid var(--line)", fontSize: 12, color: "var(--ink-tertiary)" }}>
        <span>字数：{wordCount} / 预计 {chapter.expectedWords}</span>
        <span>目标完成度：{chapter.expectedWords > 0 ? Math.min(100, Math.round((wordCount / chapter.expectedWords) * 100)) : 0}%</span>
      </div>
    </div>
  );
}
