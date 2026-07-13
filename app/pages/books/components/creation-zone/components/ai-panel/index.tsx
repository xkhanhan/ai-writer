"use client";

import { useCallback, useState, useRef } from "react";
import { Button, Spin, message } from "antd";
import { ThunderboltOutlined, EditOutlined, DeleteOutlined, ExpandOutlined, FileTextOutlined, BugOutlined } from "@ant-design/icons";
import { parseAiJson } from "@/shared/utils/parse-ai-json";
import type { CreationZoneState } from "@/app/pages/books/hooks/use-creation-zone";
import { AiLogDrawer } from "../ai-log-drawer";
import { SystemLogDrawer } from "../system-log-drawer";
import styles from "./index.module.css";

interface Props {
  bookId: string;
  zone: CreationZoneState;
}

export function AiPanel({ bookId, zone }: Props) {
  const { view } = zone;
  const [logOpen, setLogOpen] = useState(false);
  const [sysLogOpen, setSysLogOpen] = useState(false);
  const [logRefreshKey, setLogRefreshKey] = useState(0);

  // Determine current context
  const contextType = view.type === "outline" ? "outline"
    : view.type === "content-editor" || view.type === "chapter-form" ? "chapter"
    : "empty";

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>AI</span>
        <div style={{ display: "flex", gap: 4 }}>
          <button className={styles.logBtn} onClick={() => setLogOpen(true)} title="AI 日志">
            <FileTextOutlined />
          </button>
          <button className={styles.logBtn} onClick={() => setSysLogOpen(true)} title="系统日志">
            <BugOutlined />
          </button>
        </div>
      </div>
      <div className={styles.body}>
        {contextType === "outline" && (
          <OutlineAiActions bookId={bookId} zone={zone} onAiComplete={() => setLogRefreshKey((k) => k + 1)} />
        )}
        {contextType === "chapter" && <ChapterAiActions />}
        {contextType === "empty" && <EmptyHint />}
      </div>
      <AiLogDrawer open={logOpen} bookId={bookId} refreshKey={logRefreshKey} onClose={() => setLogOpen(false)} />
      <SystemLogDrawer open={sysLogOpen} onClose={() => setSysLogOpen(false)} />
    </div>
  );
}

/* ─── Outline AI Actions ─── */
function OutlineAiActions({ bookId, zone, onAiComplete }: { bookId: string; zone: CreationZoneState; onAiComplete?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ diagnosis: Record<string, string>; optimized: Record<string, string>; suggestions: string[] } | null>(null);
  const [rawText, setRawText] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const handleOptimize = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setResult(null);
    setRawText("");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const outline = zone.outline;
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          functionKey: "outline_optimize",
          bookId,
          extraVariables: {
            currentDirection: outline?.direction || "",
            currentStages: outline?.stages || "",
            currentSellingPoints: outline?.sellingPoints || "",
          },
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        message.error("AI 调用失败");
        setLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) { setLoading(false); return; }

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          const data = trimmed.slice(6);
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data) as { content?: string };
            if (parsed.content) {
              accumulated += parsed.content;
              setRawText(accumulated);
            }
          } catch { /* skip */ }
        }
      }

      onAiComplete?.();

      const parsed = parseAiJson<{ diagnosis: Record<string, string>; optimized: Record<string, string>; suggestions: string[] }>(accumulated);
      if (parsed.ok) {
        setResult(parsed.data);
      } else {
        message.warning("AI 返回格式异常");
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") message.error("AI 调用失败");
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [loading, bookId, zone, onAiComplete]);

  const handleAccept = useCallback(() => {
    if (!result) return;
    zone.saveOutline({
      direction: result.optimized.direction || zone.outline?.direction || "",
      stages: result.optimized.stages || zone.outline?.stages || "",
      sellingPoints: result.optimized.sellingPoints || zone.outline?.sellingPoints || "",
    });
    setResult(null);
    setRawText("");
    message.success("已采纳 AI 优化");
  }, [result, zone]);

  return (
    <>
      <div className={styles.actionCard} onClick={handleOptimize}>
        <ThunderboltOutlined className={styles.actionIcon} />
        <div>
          <div className={styles.actionTitle}>优化总纲</div>
          <div className={styles.actionDesc}>诊断并优化方向、阶段、卖点</div>
        </div>
      </div>

      {loading && !rawText && (
        <div className={styles.loadingState}>
          <Spin size="small" />
          <span>分析中...</span>
        </div>
      )}

      {rawText && !result && (
        <div className={styles.rawOutput}>{rawText}</div>
      )}

      {result && (
        <div className={styles.resultCard}>
          {result.diagnosis && Object.keys(result.diagnosis).length > 0 && (
            <div className={styles.resultSection}>
              <div className={styles.resultLabel}>诊断</div>
              {result.diagnosis.direction && (
                <div className={styles.resultItem}>
                  <span className={styles.resultFieldLabel}>方向：</span>{result.diagnosis.direction}
                </div>
              )}
              {result.diagnosis.stages && (
                <div className={styles.resultItem}>
                  <span className={styles.resultFieldLabel}>阶段：</span>{result.diagnosis.stages}
                </div>
              )}
              {result.diagnosis.sellingPoints && (
                <div className={styles.resultItem}>
                  <span className={styles.resultFieldLabel}>卖点：</span>{result.diagnosis.sellingPoints}
                </div>
              )}
            </div>
          )}
          {result.optimized && Object.keys(result.optimized).length > 0 && (
            <div className={styles.resultSection}>
              <div className={styles.resultLabel}>优化预览</div>
              {result.optimized.direction && (
                <div className={styles.resultItem}>
                  <span className={styles.resultFieldLabel}>方向：</span>{result.optimized.direction}
                </div>
              )}
              {result.optimized.stages && (
                <div className={styles.resultItem}>
                  <span className={styles.resultFieldLabel}>阶段：</span>{result.optimized.stages}
                </div>
              )}
              {result.optimized.sellingPoints && (
                <div className={styles.resultItem}>
                  <span className={styles.resultFieldLabel}>卖点：</span>{result.optimized.sellingPoints}
                </div>
              )}
            </div>
          )}
          {result.suggestions?.length > 0 && (
            <div className={styles.resultSection}>
              <div className={styles.resultLabel}>建议</div>
              {result.suggestions.map((s, i) => (
                <div key={i} className={styles.resultItem}>• {s}</div>
              ))}
            </div>
          )}
          <div className={styles.resultActions}>
            <Button type="primary" size="small" onClick={handleAccept}>采纳</Button>
            <Button size="small" onClick={() => { setResult(null); setRawText(""); }}>放弃</Button>
            <Button size="small" onClick={handleOptimize}>重新生成</Button>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── Chapter AI Actions ─── */
function ChapterAiActions() {
  return (
    <>
      <div className={styles.actionCard}>
        <EditOutlined className={styles.actionIcon} />
        <div>
          <div className={styles.actionTitle}>生成正文</div>
          <div className={styles.actionDesc}>根据章纲生成小说正文</div>
        </div>
      </div>
      <div className={styles.actionCard}>
        <ExpandOutlined className={styles.actionIcon} />
        <div>
          <div className={styles.actionTitle}>润色</div>
          <div className={styles.actionDesc}>提升文字表现力</div>
        </div>
      </div>
      <div className={styles.actionCard}>
        <DeleteOutlined className={styles.actionIcon} />
        <div>
          <div className={styles.actionTitle}>去AI味</div>
          <div className={styles.actionDesc}>去除AI生成痕迹</div>
        </div>
      </div>
    </>
  );
}

/* ─── Empty Hint ─── */
function EmptyHint() {
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
      <div className={styles.emptyDesc}>
        选择左侧内容开始编辑，<br />
        AI 面板会自动适配可用功能
      </div>
    </div>
  );
}
