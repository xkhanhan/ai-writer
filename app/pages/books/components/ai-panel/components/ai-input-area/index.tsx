"use client";

import { useState, useCallback, useRef } from "react";
import { Button, Input, Space, Tooltip } from "antd";
import type { InputRef } from "antd";
import {
  SendOutlined,
  StopOutlined,
  ThunderboltOutlined,
  MessageOutlined,
} from "@ant-design/icons";
import type { PanelMode } from "../../../../context/ai-context";
import { AGENT_UI_TEXT } from "@/shared/constants/agent-ui";
import styles from "./index.module.css";

const { TextArea } = Input;

interface AiInputAreaProps {
  mode: PanelMode;
  onSend: (text: string) => void;
  onStop: () => void;
  isGenerating?: boolean;
  placeholder?: string;
}

export function AiInputArea({
  mode,
  onSend,
  onStop,
  isGenerating = false,
  placeholder = "输入指令...",
}: AiInputAreaProps) {
  const [inputText, setInputText] = useState("");
  const inputRef = useRef<InputRef>(null);

  const handleSend = useCallback(() => {
    if (!inputText.trim() || isGenerating) return;
    onSend(inputText.trim());
    setInputText("");
    inputRef.current?.focus();
  }, [inputText, isGenerating, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className={styles.container}>
      <div className={styles.inputWrapper}>
        <TextArea
          ref={inputRef}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoSize={{ minRows: 1, maxRows: 4 }}
          disabled={isGenerating}
          className={styles.textArea}
        />
        <div className={styles.actions}>
          <Space size="small">
            {isGenerating ? (
              <Tooltip title={AGENT_UI_TEXT.STOP}>
                <Button
                  type="primary"
                  danger
                  icon={<StopOutlined />}
                  onClick={onStop}
                  size="small"
                />
              </Tooltip>
            ) : (
              <Tooltip title={AGENT_UI_TEXT.SEND}>
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={handleSend}
                  disabled={!inputText.trim()}
                  size="small"
                />
              </Tooltip>
            )}
          </Space>
        </div>
      </div>
      <div className={styles.hint}>
        <Space size="small">
          {mode === "QUICK" ? (
            <ThunderboltOutlined className={styles.hintIcon} />
          ) : (
            <MessageOutlined className={styles.hintIcon} />
          )}
          <span className={styles.hintText}>
            {mode === "QUICK"
              ? "快速操作模式：点击上方操作卡片或输入自定义指令"
              : "对话模式：与 AI 进行多轮对话"}
          </span>
        </Space>
      </div>
    </div>
  );
}