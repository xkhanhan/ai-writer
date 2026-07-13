"use client";

import { useState, useCallback, useMemo } from "react";
import { Spin, Button, message } from "antd";
import { ThunderboltOutlined } from "@ant-design/icons";
import { useAiContext } from "../../context/ai-context";
import { useAiStream } from "@/shared/hooks/use-ai-stream";
import type { AiAction } from "@/shared/ai/ai-action";
import styles from "./index.module.css";

export function AiAssistantPanel() {
  const { actions, bookId } = useAiContext();
  const [activeAction, setActiveAction] = useState<AiAction | null>(null);
  const [userInput, setUserInput] = useState("");

  const request = useMemo(
    () => ({
      functionKey: activeAction?.functionKey ?? ("polish" as const),
      bookId,
      selectedText: userInput,
      ...activeAction?.extraParams,
    }),
    [activeAction, bookId, userInput]
  );

  const stream = useAiStream({
    request,
    parseJson: activeAction?.resultMode === "json",
    onError: (err) => message.error(err.message),
  });

  const handleRun = useCallback(
    (action: AiAction) => {
      setActiveAction(action);
      setUserInput("");
      stream.reset();
    },
    [stream]
  );

  const handleGenerate = useCallback(() => {
    if (!activeAction) return;
    stream.reset();
    setTimeout(() => stream.run(), 0);
  }, [activeAction, stream]);

  const handleAdopt = useCallback(async () => {
    if (!activeAction || !stream.hasResult) return;
    try {
      await activeAction.onAdopt?.(stream.result);
      message.success("已采纳");
      stream.reset();
      setActiveAction(null);
    } catch {
      message.error("采纳失败");
    }
  }, [activeAction, stream]);

  // ─── 空状态 ───
  if (actions.length === 0) {
    return (
      <div className={styles.emptyHint}>
        <div className={styles.emptyIcon}>
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <path
              d="M16 4l3 7.5L27 14l-5.5 5 1.5 8L16 22.5 9 27l1.5-8L5 14l8-2.5L16 4z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
              fill="none"
              opacity="0.25"
            />
          </svg>
        </div>
        <div className={styles.emptyTitle}>AI 写作助手</div>
        <div className={styles.emptyDesc}>当前页面暂无可用的 AI 功能</div>
      </div>
    );
  }

  // ─── 结果视图 ───
  if (activeAction && (stream.hasResult || stream.rawText)) {
    return (
      <div className={styles.body}>
        <div className={styles.resultHeader}>{activeAction.title}</div>
        {stream.loading && stream.rawText && (
          <div className={styles.rawOutput}>{stream.rawText}</div>
        )}
        {!stream.loading && stream.hasResult && (
          <div className={styles.resultCard}>
            <pre className={styles.resultPre}>
              {typeof stream.result === "string"
                ? stream.result
                : JSON.stringify(stream.result, null, 2)}
            </pre>
            {activeAction.onAdopt && (
              <div className={styles.resultActions}>
                <Button type="primary" size="small" onClick={handleAdopt}>
                  采纳
                </Button>
                <Button
                  size="small"
                  onClick={() => {
                    stream.reset();
                    setActiveAction(null);
                  }}
                >
                  放弃
                </Button>
                <Button size="small" onClick={() => stream.run()}>
                  重新生成
                </Button>
              </div>
            )}
          </div>
        )}
        {stream.loading && !stream.rawText && (
          <div className={styles.loadingState}>
            <Spin size="small" />
            <span>生成中...</span>
          </div>
        )}
      </div>
    );
  }

  // ─── 操作列表 ───
  return (
    <div className={styles.body}>
      {actions.map((action) => (
        <div key={action.id}>
          <div className={styles.actionCard} onClick={() => handleRun(action)}>
            <div>
              <div className={styles.actionTitle}>{action.title}</div>
              <div className={styles.actionDesc}>{action.description}</div>
            </div>
          </div>
          {activeAction?.id === action.id && action.inputLabel && (
            <div className={styles.inputArea}>
              <div className={styles.inputLabel}>{action.inputLabel}</div>
              <textarea
                className={styles.inputTextarea}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder={action.inputPlaceholder || ""}
                rows={3}
              />
              <Button
                type="primary"
                size="small"
                icon={<ThunderboltOutlined />}
                loading={stream.loading}
                onClick={handleGenerate}
              >
                生成
              </Button>
              <Button
                size="small"
                onClick={() => {
                  stream.reset();
                  setActiveAction(null);
                }}
              >
                取消
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
