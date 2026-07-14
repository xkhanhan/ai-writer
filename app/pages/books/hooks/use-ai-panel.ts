"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { message } from "antd";
import { useAiContext } from "../context/ai-context";
import type { PanelMode, Scene, QuickAction } from "../context/ai-context";
import { AGENT_UI_TEXT } from "@/shared/constants/agent-ui";

/** 流式结果 */
export interface StreamResult {
  text: string;
  isComplete: boolean;
  isStreaming: boolean;
  error: Error | null;
}

/** useAiPanel 返回值 */
export interface UseAiPanelReturn {
  mode: PanelMode;
  setMode: (mode: PanelMode) => void;
  scenes: Scene[];
  activeScene: Scene | null;
  selectScene: (scene: Scene) => void;
  streamResult: StreamResult;
  messages: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
    parts?: Array<{
      type: string;
      text?: string;
      [key: string]: unknown;
    }>;
  }>;
  sendMessage: (text: string) => void;
  sendQuickAction: (action: QuickAction) => void;
  adoptResult: () => void;
  resetResult: () => void;
  stopGeneration: () => void;
  isGenerating: boolean;
  error: Error | null;
}

export function useAiPanel(bookId: string): UseAiPanelReturn {
  const {
    panelMode,
    setPanelMode,
    editorContext,
    activeScene,
    setActiveScene,
  } = useAiContext();

  const [scenes, setScenes] = useState<Scene[]>([]);
  const [streamResult, setStreamResult] = useState<StreamResult>({
    text: "",
    isComplete: false,
    isStreaming: false,
    error: null,
  });
  const [conversationId, setConversationId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Use Vercel AI SDK's useChat for chat mode
  const chatHelpers = useChat({
    id: conversationId ?? "default",
    transport: new DefaultChatTransport({
      api: "/api/ai/agent/chat",
    }),
    onFinish: () => {
      setStreamResult((prev) => ({
        ...prev,
        isStreaming: false,
        isComplete: true,
      }));
    },
    onError: (err: Error) => {
      setStreamResult((prev) => ({
        ...prev,
        isStreaming: false,
        error: err,
      }));
      message.error(err.message || AGENT_UI_TEXT.CHAT_ERROR);
    },
  });

  const loadScenes = useCallback(async () => {
    try {
      const response = await fetch("/api/ai/agent/scenes");
      const data = await response.json();
      setScenes(data.scenes || []);
      if (data.scenes?.length > 0 && !activeScene) {
        setActiveScene(data.scenes[0]);
      }
    } catch (err) {
      console.error("Failed to load scenes:", err);
    }
  }, [activeScene, setActiveScene]);

  // Load scenes on mount
  useEffect(() => {
    loadScenes();
  }, [loadScenes]);

  const setMode = useCallback((mode: PanelMode) => {
    setPanelMode(mode);
  }, [setPanelMode]);

  const selectScene = useCallback((scene: Scene) => {
    setActiveScene(scene);
    setConversationId(null);
    chatHelpers.setMessages([]);
  }, [setActiveScene, chatHelpers]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    setStreamResult({
      text: "",
      isComplete: false,
      isStreaming: true,
      error: null,
    });

    if (panelMode === "CHAT") {
      // Use chat API for conversation mode
      await chatHelpers.sendMessage(
        { text },
        {
          body: {
            sceneId: activeScene?.id,
            bookId,
            conversationId,
            editorContext,
          },
        }
      );
    } else {
      // Use regular AI API for quick actions
      try {
        abortControllerRef.current = new AbortController();
        const response = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            functionKey: activeScene?.functionKey || "content_generate",
            bookId,
            selectedText: editorContext.selectedText || undefined,
            chapterId: editorContext.chapterId || undefined,
            stream: true,
            extraVariables: {
              prompt: text,
              ...editorContext,
            },
          }),
          signal: abortControllerRef.current.signal,
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
                  setStreamResult({
                    text: accumulated,
                    isComplete: false,
                    isStreaming: true,
                    error: null,
                  });
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
        }

        setStreamResult({
          text: accumulated,
          isComplete: true,
          isStreaming: false,
          error: null,
        });
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          // Generation was aborted
          return;
        }
        const errorMessage = err instanceof Error ? err.message : "AI 生成失败";
        setStreamResult((prev) => ({
          ...prev,
          isStreaming: false,
          error: new Error(errorMessage),
        }));
        message.error(errorMessage);
      }
    }
  }, [panelMode, chatHelpers, activeScene, bookId, conversationId, editorContext]);

  const sendQuickAction = useCallback((action: QuickAction) => {
    sendMessage(action.prompt);
  }, [sendMessage]);

  const adoptResult = useCallback(() => {
    if (!streamResult.text) return;

    // Dispatch custom event for editor to listen to
    const event = new CustomEvent("ai-adopt-result", {
      detail: {
        content: streamResult.text,
        mode: panelMode,
        scene: activeScene,
      },
    });
    window.dispatchEvent(event);

    // Reset result after adoption
    setStreamResult({
      text: "",
      isComplete: false,
      isStreaming: false,
      error: null,
    });
  }, [streamResult.text, panelMode, activeScene]);

  const resetResult = useCallback(() => {
    setStreamResult({
      text: "",
      isComplete: false,
      isStreaming: false,
      error: null,
    });
  }, []);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (panelMode === "CHAT") {
      chatHelpers.stop();
    }
    setStreamResult((prev) => ({
      ...prev,
      isStreaming: false,
    }));
  }, [panelMode, chatHelpers]);

  // Transform messages to match expected format
  const transformedMessages = chatHelpers.messages.map((msg) => ({
    id: msg.id,
    role: msg.role as "user" | "assistant",
    content: msg.parts
      ? msg.parts
          .filter((p: any) => p.type === "text")
          .map((p: any) => p.text)
          .join("")
      : "",
    parts: msg.parts,
  }));

  return {
    mode: panelMode,
    setMode,
    scenes,
    activeScene,
    selectScene,
    streamResult,
    messages: transformedMessages,
    sendMessage,
    sendQuickAction,
    adoptResult,
    resetResult,
    stopGeneration,
    isGenerating: streamResult.isStreaming,
    error: streamResult.error,
  };
}