"use client";

import { useRef, useEffect } from "react";
import { Spin, Typography, Alert } from "antd";
import { RobotOutlined, UserOutlined } from "@ant-design/icons";
import { AGENT_UI_TEXT } from "@/shared/constants/agent-ui";
import styles from "./index.module.css";

const { Text } = Typography;

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
}

interface ChatMessagesProps {
  messages: Message[];
  isLoading?: boolean;
  error?: Error | null;
}

export function ChatMessages({
  messages,
  isLoading = false,
  error = null,
}: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className={styles.container}>
      {/* Welcome message when no messages */}
      {messages.length === 0 && !isLoading && (
        <div className={styles.welcome}>
          <RobotOutlined className={styles.welcomeIcon} />
          <Text className={styles.welcomeTitle}>
            {AGENT_UI_TEXT.PANEL_TITLE}
          </Text>
          <Text type="secondary" className={styles.welcomeHint}>
            {AGENT_UI_TEXT.WELCOME_HINT}
          </Text>
        </div>
      )}

      {/* Messages list */}
      <div className={styles.messagesList}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`${styles.message} ${
              msg.role === "user" ? styles.userMessage : styles.assistantMessage
            }`}
          >
            <div className={styles.messageAvatar}>
              {msg.role === "user" ? <UserOutlined /> : <RobotOutlined />}
            </div>
            <div className={styles.messageContent}>
              <div className={styles.messageRole}>
                {msg.role === "user"
                  ? AGENT_UI_TEXT.ROLE_USER
                  : AGENT_UI_TEXT.ROLE_AI}
              </div>
              <div className={styles.messageText}>{msg.content}</div>
              {msg.timestamp && (
                <div className={styles.messageTime}>
                  {msg.timestamp.toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className={`${styles.message} ${styles.assistantMessage}`}>
            <div className={styles.messageAvatar}>
              <RobotOutlined />
            </div>
            <div className={styles.messageContent}>
              <Spin size="small" />
              <Text type="secondary" className={styles.loadingText}>
                {AGENT_UI_TEXT.PROCESSING}
              </Text>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <Alert
            message={AGENT_UI_TEXT.CHAT_ERROR}
            description={error.message}
            type="error"
            showIcon
            className={styles.errorAlert}
          />
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}