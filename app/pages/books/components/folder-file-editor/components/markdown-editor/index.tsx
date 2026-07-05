"use client";

import { Input, Tag } from "antd";
import type { TextAreaRef } from "antd/es/input/TextArea";
import type { BookFile } from "@/app/types";

interface MarkdownEditorProps {
  file: BookFile;
  saveStatus: "idle" | "saving" | "saved";
  textareaRef: React.RefObject<TextAreaRef | null>;
  onChange: (content: string) => void;
  onCompositionStart: () => void;
  onCompositionEnd: (event: React.CompositionEvent<HTMLTextAreaElement>) => void;
}

export function MarkdownEditor({
  file,
  saveStatus,
  textareaRef,
  onChange,
  onCompositionStart,
  onCompositionEnd
}: MarkdownEditorProps) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", borderBottom: "1px solid var(--line)", background: "var(--panel)", flexShrink: 0 }}>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 14, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {file.name}.md
        </span>
        {saveStatus === "saving" ? (
          <Tag>保存中...</Tag>
        ) : saveStatus === "saved" ? (
          <Tag color="green">已保存</Tag>
        ) : null}
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        <Input.TextArea
          ref={textareaRef}
          defaultValue={file.content}
          onChange={(event) => onChange(event.target.value)}
          onCompositionStart={onCompositionStart}
          onCompositionEnd={onCompositionEnd}
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            resize: "none",
            padding: 32,
            fontFamily: "var(--font-body)",
            fontSize: 15,
            lineHeight: 1.8,
            color: "var(--text)",
            background: "var(--bg)",
          }}
          styles={{
            textarea: {
              height: "100%",
              border: "none",
              resize: "none",
              padding: 32,
              fontFamily: "var(--font-body)",
              fontSize: 15,
              lineHeight: 1.8,
              color: "var(--text)",
              background: "var(--bg)",
            },
          }}
          variant="borderless"
          autoSize={false}
        />
      </div>
    </>
  );
}
