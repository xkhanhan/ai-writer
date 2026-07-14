"use client";

import { useCallback } from "react";
import { Spin, Empty } from "antd";
import { RobotOutlined } from "@ant-design/icons";
import { useAiPanel } from "../../hooks/use-ai-panel";
import type { QuickAction } from "../../context/ai-context";
import { AiPanelHeader } from "./components/ai-panel-header";
import { QuickActions } from "./components/quick-actions";
import { ChatMessages } from "./components/chat-messages";
import { AiInputArea } from "./components/ai-input-area";
import { ResultCard } from "./components/result-card";
import { AGENT_UI_TEXT } from "@/shared/constants/agent-ui";
import styles from "./index.module.css";

interface AiPanelProps {
  bookId: string;
  onAdopt?: (content: string) => void;
}

export function AiPanel({ bookId, onAdopt }: AiPanelProps) {
  const {
    mode,
    setMode,
    scenes,
    activeScene,
    selectScene,
    streamResult,
    messages,
    sendMessage,
    sendQuickAction,
    adoptResult,
    resetResult,
    stopGeneration,
    isGenerating,
    error,
  } = useAiPanel(bookId);

  const handleAdopt = useCallback(() => {
    adoptResult();
    if (onAdopt && streamResult.text) {
      onAdopt(streamResult.text);
    }
  }, [adoptResult, onAdopt, streamResult.text]);

  const handleSendMessage = useCallback((text: string) => {
    sendMessage(text);
  }, [sendMessage]);

  const handleQuickAction = useCallback((action: QuickAction) => {
    sendQuickAction(action);
  }, [sendQuickAction]);

  // Empty state when no scenes loaded
  if (scenes.length === 0) {
    return (
      <div className={styles.emptyState}>
        <Spin size="large" />
        <div className={styles.emptyText}>{AGENT_UI_TEXT.LOADING}</div>
      </div>
    );
  }

  // Empty state when no active scene
  if (!activeScene) {
    return (
      <div className={styles.emptyState}>
        <Empty
          image={<RobotOutlined style={{ fontSize: 48, color: "#bfbfbf" }} />}
          description={AGENT_UI_TEXT.SCENE_SELECT}
        />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header with mode switch and scene selector */}
      <AiPanelHeader
        mode={mode}
        onModeChange={setMode}
        scenes={scenes}
        activeScene={activeScene}
        onSceneChange={selectScene}
      />

      {/* Main content area */}
      <div className={styles.content}>
        {mode === "QUICK" ? (
          /* Quick actions mode */
          <div className={styles.quickMode}>
            <QuickActions
              scene={activeScene}
              onActionClick={handleQuickAction}
              disabled={isGenerating}
            />

            {/* Show result card if there's a result */}
            {(streamResult.text || streamResult.isStreaming) && (
              <ResultCard
                result={streamResult}
                onAdopt={handleAdopt}
                onReset={resetResult}
                onStop={stopGeneration}
                isGenerating={isGenerating}
              />
            )}
          </div>
        ) : (
          /* Chat mode */
          <div className={styles.chatMode}>
            <ChatMessages
              messages={messages}
              isLoading={isGenerating}
              error={error}
            />
          </div>
        )}
      </div>

      {/* Input area */}
      <AiInputArea
        mode={mode}
        onSend={handleSendMessage}
        onStop={stopGeneration}
        isGenerating={isGenerating}
        placeholder={
          mode === "QUICK"
            ? "输入自定义指令..."
            : "描述你的需求..."
        }
      />
    </div>
  );
}