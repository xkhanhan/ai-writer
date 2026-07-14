"use client";

/**
 * @deprecated This component is deprecated. Use the unified AiPanel component instead.
 * @see app/pages/books/components/ai-panel
 */

import { useEffect, useCallback, useRef, useState } from "react";
import { Button, Spin } from "antd";
import {
  ReloadOutlined,
  CloseOutlined,
  CheckOutlined,
  ThunderboltOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { showError, showSuccess } from "@/app/utils/error-handler";
import styles from "./index.module.css";

export type AiFunctionKey =
  | "content_generate"
  | "deslop"
  | "polish"
  | "expand";

interface AiResultPanelProps {
  visible: boolean;
  functionKey: AiFunctionKey;
  bookId: string;
  chapterId?: string;
  selectedText?: string;
  onAdopt: (content: string) => void;
  onCancel: () => void;
}

interface GenerationMetadata {
  functionKey: string;
  estimatedTokens?: number;
  latencyMs?: number;
  bookTitle?: string;
  chapterTitle?: string;
}

interface DebugContext {
  systemPrompt: string;
  userPrompt: string;
}

const FUNCTION_LABELS: Record<AiFunctionKey, string> = {
  content_generate: "AI 生成内容",
  deslop: "去除AI味",
  polish: "润色",
  expand: "扩写",
};

export function AiResultPanel({
  visible,
  functionKey,
  bookId,
  chapterId,
  selectedText,
  onAdopt,
  onCancel,
}: AiResultPanelProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");
  const [metadata, setMetadata] = useState<GenerationMetadata | null>(null);
  const [debug, setDebug] = useState<DebugContext | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasAutoStarted = useRef(false);

  const callApi = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult("");
    setMetadata(null);
    setDebug(null);
    setShowDebug(false);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          functionKey,
          bookId,
          chapterId,
          selectedText: selectedText || undefined,
          stream: true,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "AI 生成失败");
      }

      const contentType = response.headers.get("content-type") || "";
      const reader = response.body?.getReader();
      if (!reader) throw new Error("无法读取响应流");

      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      if (contentType.includes("text/event-stream")) {
        // Streaming mode
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
                setResult(accumulated);
              }
            } catch {
              // skip malformed SSE chunk
            }
          }
        }
      } else {
        // Fallback: non-streaming JSON response
        reader.releaseLock();
        const data = await response.json();
        if (data.success === false) throw new Error(data.error || "AI 生成失败");
        accumulated = data.content ?? "";
        setResult(accumulated);
        setMetadata(data.metadata ?? null);
        setDebug(data.debug ?? null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "AI 生成失败";
      setError(message);
      showError(message);
    } finally {
      setLoading(false);
    }
  }, [functionKey, bookId, chapterId, selectedText]);

  // Trigger generation once when panel becomes visible
  useEffect(() => {
    if (!visible) {
      hasAutoStarted.current = false;
      return;
    }
    if (!hasAutoStarted.current) {
      hasAutoStarted.current = true;
      void callApi();
    }
  }, [visible, callApi]);

  if (!visible) return null;

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>
          <ThunderboltOutlined />
          {FUNCTION_LABELS[functionKey]}
        </span>
        <Button
          type="text"
          size="small"
          icon={<CloseOutlined />}
          onClick={onCancel}
          aria-label="关闭 AI 结果面板"
        />
      </div>

      <div className={styles.panelBody}>
        {loading && !result && (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
            <Spin tip="正在生成中..." />
          </div>
        )}

        {error && (
          <div className={styles.errorState}>
            <ExclamationCircleOutlined style={{ fontSize: 24 }} />
            <span>{error}</span>
            <Button size="small" icon={<ReloadOutlined />} onClick={() => void callApi()}>
              重试
            </Button>
          </div>
        )}

        {!error && result && (
          <div className={styles.resultText}>
            {result}
            {loading && <span className={styles.cursor} />}
          </div>
        )}
      </div>

      {metadata && (
        <div className={styles.metadata}>
          {metadata.estimatedTokens != null && (
            <span className={styles.metadataTag}>
              tokens: {metadata.estimatedTokens}
            </span>
          )}
          {metadata.latencyMs != null && (
            <span className={styles.metadataTag}>
              耗时: {(metadata.latencyMs / 1000).toFixed(1)}s
            </span>
          )}
          {debug && (
            <span
              className={styles.debugToggle}
              onClick={() => setShowDebug(!showDebug)}
              role="button"
              tabIndex={0}
            >
              {showDebug ? "收起 Prompt" : "查看 Prompt"}
            </span>
          )}
        </div>
      )}

      {showDebug && debug && (
        <div className={styles.debugSection}>
          <div className={styles.debugBlock}>
            <div className={styles.debugLabel}>System Prompt</div>
            <pre className={styles.debugPre}>{debug.systemPrompt}</pre>
          </div>
          <div className={styles.debugBlock}>
            <div className={styles.debugLabel}>User Prompt</div>
            <pre className={styles.debugPre}>{debug.userPrompt}</pre>
          </div>
        </div>
      )}

      <div className={styles.panelFooter}>
        <Button
          size="small"
          icon={<ReloadOutlined />}
          loading={loading}
          onClick={() => void callApi()}
        >
          重新生成
        </Button>
        <Button size="small" onClick={onCancel}>
          放弃
        </Button>
        <Button
          type="primary"
          size="small"
          icon={<CheckOutlined />}
          disabled={loading || !!error || !result}
          onClick={() => {
            onAdopt(result);
            showSuccess("内容已采纳");
          }}
        >
          采纳
        </Button>
      </div>
    </div>
  );
}
