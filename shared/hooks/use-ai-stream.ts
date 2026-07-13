/**
 * useAiStream — 通用 SSE 流式 AI 调用 hook。
 *
 * 放在 shared/hooks/ 遵循工程规范：
 * - 不依赖 app/pages/ 下的任何模块
 * - 依赖 shared/ai/ai-action.ts（类型）和 shared/utils/（工具函数）
 * - 清理所有副作用（AbortController）
 */
"use client";

import { useState, useCallback, useRef } from "react";
import type { AiChatRequest } from "@/shared/ai/ai-action";
import { parseAiJson } from "@/shared/utils/parse-ai-json";

export interface UseAiStreamOptions {
  /** 请求体（不含 stream 字段，hook 自动添加） */
  request: Omit<AiChatRequest, "stream">;
  /** 是否解析 JSON 结果 */
  parseJson?: boolean;
  /** 流式回调，每次收到新内容时触发 */
  onChunk?: (accumulated: string) => void;
  /** 完成回调 */
  onComplete?: (result: string | unknown) => void;
  /** 错误回调 */
  onError?: (error: Error) => void;
}

export interface UseAiStreamReturn {
  /** 是否正在加载 */
  loading: boolean;
  /** 流式累积的原始文本 */
  rawText: string;
  /** 最终结果（文本或解析后的 JSON） */
  result: unknown;
  /** 是否有结果 */
  hasResult: boolean;
  /** 发起 AI 调用 */
  run: () => Promise<void>;
  /** 中止当前调用 */
  abort: () => void;
  /** 重置状态 */
  reset: () => void;
}

export function useAiStream(options: UseAiStreamOptions): UseAiStreamReturn {
  const { request, parseJson = false, onChunk, onComplete, onError } = options;

  const [loading, setLoading] = useState(false);
  const [rawText, setRawText] = useState("");
  const [result, setResult] = useState<unknown>(null);
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setRawText("");
    setResult(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...request, stream: true }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = new Error(`AI 调用失败 (${res.status})`);
        onError?.(err);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) return;

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
              onChunk?.(accumulated);
            }
          } catch { /* skip non-JSON lines */ }
        }
      }

      if (parseJson) {
        const parsed = parseAiJson(accumulated);
        setResult(parsed.ok ? parsed.data : accumulated);
        onComplete?.(parsed.ok ? parsed.data : accumulated);
      } else {
        setResult(accumulated);
        onComplete?.(accumulated);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        onError?.(err instanceof Error ? err : new Error("AI 调用失败"));
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [loading, request, parseJson, onChunk, onComplete, onError]);

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    abort();
    setLoading(false);
    setRawText("");
    setResult(null);
  }, [abort]);

  return { loading, rawText, result, hasResult: result !== null, run, abort, reset };
}
