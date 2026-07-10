"use client";

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
  const [error, setError] = useState<string | null>(null);
  const hasAutoStarted = useRef(false);

  const callApi = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult("");
    setMetadata(null);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          functionKey,
          bookId,
          chapterId,
          selectedText: selectedText || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.error || "AI 生成失败");
      }

      setResult(data.content);
      setMetadata(data.metadata ?? null);
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
        {loading && (
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

        {!loading && !error && result && (
          <div className={styles.resultText}>{result}</div>
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
