/**
 * AiSceneModal — Generic AI scene modal for all workspace panels.
 *
 * Handles: streaming SSE → JSON/text parsing → preview → save.
 * Each panel provides a scene config (functionKey, input, result format, save handler).
 */

"use client";

import { useState, useCallback } from "react";
import { Button, Input, Spin, Descriptions, Tag, Typography, Checkbox } from "antd";
import { ThunderboltOutlined, CheckOutlined, CloseOutlined } from "@ant-design/icons";
import BaseModal from "@/shared/ui/base-modal";
import { showError, showSuccess } from "@/app/utils/error-handler";
import styles from "./index.module.css";

// ============================================================================
// Types
// ============================================================================

/** A structured field for preview display */
export interface AiPreviewField {
  label: string;
  key?: string; // dot-path like "title" or "tags" (array rendered as Tags)
  span?: number; // Descriptions.Item span, default 1
  type?: "tag" | "text" | "success"; // display style
}

/** How the AI result is rendered */
export type AiResultMode =
  | { type: "text" } // plain text display (Markdown-like)
  | { type: "json"; fields: AiPreviewField[] }; // structured table

/** Scene configuration — each AI feature defines one */
export interface AiSceneConfig {
  /** Unique scene ID, e.g. "book_info_suggest", "world_rule_suggest" */
  id: string;
  /** Display title in modal header */
  title: string;
  /** Maps to context-builder functionKey */
  functionKey: string;
  /** Label above the textarea */
  inputLabel: string;
  /** Placeholder text */
  inputPlaceholder: string;
  /** Result display mode */
  resultMode: AiResultMode;
  /** Extra body params to send (e.g. { chapterId }) */
  extraParams?: Record<string, unknown>;
}

interface AiSceneModalProps {
  open: boolean;
  scene: AiSceneConfig;
  bookId: string;
  onClose: () => void;
  /** Called after successful save. Should refresh parent data. */
  onSaved: () => void;
  /** Custom save handler. Receives parsed result. For text mode: string. For JSON mode: parsed object. */
  onSave: (result: unknown) => Promise<void>;
  /** Optional: render custom preview instead of default Descriptions */
  renderPreview?: (result: Record<string, unknown>) => React.ReactNode;
}

// ============================================================================
// Component
// ============================================================================

export function AiSceneModal({
  open,
  scene,
  bookId,
  onClose,
  onSaved,
  onSave,
  renderPreview,
}: AiSceneModalProps) {
  const [concept, setConcept] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [rawResult, setRawResult] = useState("");
  const [parsedResult, setParsedResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  const hasResult = scene.resultMode.type === "text"
    ? rawResult.length > 0
    : parsedResult !== null;

  // --- Streaming call ---
  const handleGenerate = useCallback(async () => {
    if (!concept.trim()) return;
    setLoading(true);
    setStreaming(true);
    setError(null);
    setRawResult("");
    setParsedResult(null);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          functionKey: scene.functionKey,
          bookId,
          selectedText: concept.trim(),
          stream: true,
          ...scene.extraParams,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "AI 生成失败");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("无法读取响应流");

      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          const data = trimmed.slice(6);
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data) as { content?: string };
            if (parsed.content) {
              accumulated += parsed.content;
              setRawResult(accumulated);
            }
          } catch { /* skip */ }
        }
      }

      // Parse result
      if (scene.resultMode.type === "text") {
        setParsedResult(accumulated);
      } else {
        setParsedResult(parseJsonFromText(accumulated));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "AI 生成失败";
      setError(msg);
      showError(msg);
    } finally {
      setLoading(false);
      setStreaming(false);
    }
  }, [concept, bookId, scene]);

  // --- Save ---
  const handleSave = useCallback(async () => {
    if (parsedResult === null && rawResult === "") return;
    try {
      await onSave(scene.resultMode.type === "text" ? rawResult : parsedResult);
      showSuccess("保存成功");
      onSaved();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "保存失败";
      showError(msg);
    }
  }, [parsedResult, rawResult, scene.resultMode.type, onSave, onSaved]);

  // --- Reset ---
  const resetAll = () => {
    setConcept("");
    setRawResult("");
    setParsedResult(null);
    setError(null);
  };

  const handleClose = () => {
    resetAll();
    onClose();
  };

  // --- Footer ---
  const footer = hasResult
    ? [
        <Button key="cancel" onClick={handleClose}>放弃</Button>,
        <Button key="regenerate" onClick={() => { resetAll(); void handleGenerate(); }} loading={loading}>重新生成</Button>,
        <Button key="save" type="primary" icon={<CheckOutlined />} onClick={() => void handleSave()}>保存</Button>,
      ]
    : null;

  const rec = parsedResult as Record<string, unknown> | null;

  return (
    <BaseModal
      title={scene.title}
      open={open}
      onCancel={handleClose}
      width={640}
      footer={footer}
      closable
      maskClosable
      destroyOnClose
    >
      <div className={styles.body}>
        {/* Input — always visible */}
        <div className={styles.inputSection}>
          <div className={styles.inputLabel}>{scene.inputLabel}</div>
          <Input.TextArea
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            placeholder={scene.inputPlaceholder}
            rows={3}
            maxLength={500}
            disabled={loading}
          />
          <div className={styles.inputFooter}>
            <span className={styles.charCount}>{concept.length}/500</span>
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              loading={loading}
              disabled={!concept.trim()}
              onClick={() => void handleGenerate()}
            >
              {hasResult ? "重新生成" : "生成建议"}
            </Button>
          </div>
        </div>

        {/* Streaming output */}
        {loading && streaming && rawResult && (
          <div className={styles.resultSection}>
            <div className={styles.resultLabel}>AI 生成中...</div>
            <pre className={styles.resultPre}>{rawResult}</pre>
          </div>
        )}

        {loading && streaming && !rawResult && (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
            <Spin tip="正在生成..." />
          </div>
        )}

        {/* Preview */}
        {!loading && hasResult && (
          <div className={styles.resultSection}>
            <div className={styles.resultLabel}>生成结果</div>
            {scene.resultMode.type === "text" ? (
              <pre className={styles.resultPre}>{rawResult}</pre>
            ) : renderPreview && rec ? (
              renderPreview(rec)
            ) : rec ? (
              <DefaultJsonPreview fields={scene.resultMode.fields} data={rec} />
            ) : null}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className={styles.errorState}>
            <span>{error}</span>
            <Button size="small" onClick={() => void handleGenerate()}>重试</Button>
          </div>
        )}
      </div>
    </BaseModal>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function parseJsonFromText(text: string): Record<string, unknown> {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
    if (match?.[1]) return JSON.parse(match[1]);
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end > start) return JSON.parse(text.slice(start, end + 1));
    throw new Error("AI 返回内容无法解析为 JSON");
  }
}

function DefaultJsonPreview({ fields, data }: { fields: AiPreviewField[]; data: Record<string, unknown> }) {
  return (
    <Descriptions column={2} size="small" bordered>
      {fields.map((f) => {
        const val = f.key ? getNestedValue(data, f.key) : "";
        const span = f.span ?? 1;
        const display = renderFieldValue(val, f.type);
        return (
          <Descriptions.Item key={f.key ?? f.label} label={f.label} span={span}>
            {display}
          </Descriptions.Item>
        );
      })}
    </Descriptions>
  );
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function renderFieldValue(val: unknown, type?: string): React.ReactNode {
  if (val === undefined || val === null || val === "") return <span style={{ color: "var(--text-light)" }}>—</span>;
  if (type === "tag" && Array.isArray(val)) {
    return val.map((t, i) => <Tag key={i} color="green">{String(t)}</Tag>);
  }
  if (type === "success") {
    return <Typography.Text type="success">{String(val)}</Typography.Text>;
  }
  if (Array.isArray(val)) {
    return val.map((t, i) => <Tag key={i}>{String(t)}</Tag>);
  }
  return String(val);
}
