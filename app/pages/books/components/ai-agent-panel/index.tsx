"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import {
  Button,
  Input,
  Spin,
  Select,
  Tag,
  Card,
  Typography,
  Space,
  Divider,
  message,
  Tooltip,
} from "antd";
import {
  SendOutlined,
  ThunderboltOutlined,
  HistoryOutlined,
  DeleteOutlined,
  ReloadOutlined,
  StopOutlined,
  RobotOutlined,
  UserOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import { useAiContext } from "../../context/ai-context";
import styles from "./index.module.css";

const { Text, Paragraph } = Typography;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Scene {
  id: string;
  name: string;
  description: string;
  icon: string;
  functionKey: string;
  quickActions: QuickAction[];
}

interface QuickAction {
  id: string;
  name: string;
  description: string;
  icon: string;
  prompt: string;
}

interface Conversation {
  id: string;
  title: string;
  scene_id: string;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AiAgentPanel() {
  const { bookId } = useAiContext();
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [activeScene, setActiveScene] = useState<Scene | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);

  // Use Vercel AI SDK's useChat
  const chatHelpers = useChat({
    id: conversationId ?? "default",
    onFinish: (event: any) => {
      setIsLoading(false);
      // Add assistant message to local state
      if (event.message) {
        setMessages((prev) => [...prev, event.message]);
      }
    },
    onError: (err: Error) => {
      setIsLoading(false);
      message.error(err.message || "对话出错");
    },
  });

  const sendMessage = chatHelpers.sendMessage;
  const stop = chatHelpers.stop;
  const error = chatHelpers.error;

  // Load scenes on mount
  useEffect(() => {
    loadScenes();
  }, []);

  // Load conversations when scene changes
  useEffect(() => {
    if (activeScene) {
      loadConversations();
    }
  }, [activeScene, bookId]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadScenes = async () => {
    try {
      const response = await fetch("/api/ai/agent/scenes");
      const data = await response.json();
      setScenes(data.scenes || []);
      if (data.scenes?.length > 0) {
        setActiveScene(data.scenes[0]);
      }
    } catch (err) {
      console.error("Failed to load scenes:", err);
    }
  };

  const loadConversations = async () => {
    if (!activeScene || !bookId) return;
    try {
      const response = await fetch(
        `/api/ai/agent/conversations?bookId=${bookId}&sceneId=${activeScene.id}`
      );
      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (err) {
      console.error("Failed to load conversations:", err);
    }
  };

  const handleSceneChange = (sceneId: string) => {
    const scene = scenes.find((s) => s.id === sceneId);
    if (scene) {
      setActiveScene(scene);
      setConversationId(null);
      setMessages([]);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      role: "user",
      content: inputText,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);

    await sendMessage(
      { text: inputText },
      {
        body: {
          sceneId: activeScene?.id,
          bookId,
          conversationId,
        },
      }
    );
  };

  const handleQuickAction = (action: QuickAction) => {
    const userMessage = {
      id: Date.now().toString(),
      role: "user",
      content: action.prompt,
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    sendMessage(
      { text: action.prompt },
      {
        body: {
          sceneId: activeScene?.id,
          bookId,
          conversationId,
        },
      }
    );
  };

  const handleNewConversation = () => {
    setConversationId(null);
    setMessages([]);
  };

  const handleSelectConversation = async (conv: Conversation) => {
    setConversationId(conv.id);
    setShowHistory(false);

    // Load messages for this conversation
    try {
      const response = await fetch(
        `/api/ai/agent/conversations/${conv.id}/messages`
      );
      const data = await response.json();
      if (data.messages) {
        setMessages(
          data.messages.map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
          }))
        );
      }
    } catch (err) {
      console.error("Failed to load messages:", err);
    }
  };

  const handleDeleteConversation = async (convId: string) => {
    try {
      await fetch(`/api/ai/agent/conversations?id=${convId}`, {
        method: "DELETE",
      });
      if (conversationId === convId) {
        setConversationId(null);
        setMessages([]);
      }
      loadConversations();
      message.success("对话已删除");
    } catch (err) {
      message.error("删除失败");
    }
  };

  // Empty state
  if (scenes.length === 0) {
    return (
      <div className={styles.emptyState}>
        <RobotOutlined className={styles.emptyIcon} />
        <div className={styles.emptyTitle}>AI 写作助手</div>
        <div className={styles.emptyDesc}>加载中...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <Select
          value={activeScene?.id}
          onChange={handleSceneChange}
          className={styles.sceneSelect}
          options={scenes.map((s) => ({
            label: `${s.icon} ${s.name}`,
            value: s.id,
          }))}
        />
        <Space>
          <Tooltip title="历史对话">
            <Button
              type="text"
              icon={<HistoryOutlined />}
              onClick={() => setShowHistory(!showHistory)}
            />
          </Tooltip>
          <Tooltip title="新对话">
            <Button
              type="text"
              icon={<ReloadOutlined />}
              onClick={handleNewConversation}
            />
          </Tooltip>
        </Space>
      </div>

      {/* Quick Actions */}
      {activeScene && activeScene.quickActions.length > 0 && (
        <div className={styles.quickActions}>
          {activeScene.quickActions.map((action) => (
            <Button
              key={action.id}
              size="small"
              icon={<ThunderboltOutlined />}
              onClick={() => handleQuickAction(action)}
              disabled={isLoading}
            >
              {action.name}
            </Button>
          ))}
        </div>
      )}

      {/* History Panel */}
      {showHistory && (
        <div className={styles.historyPanel}>
          <div className={styles.historyHeader}>
            <Text strong>历史对话</Text>
            <Button
              type="text"
              size="small"
              onClick={() => setShowHistory(false)}
            >
              关闭
            </Button>
          </div>
          <div className={styles.historyList}>
            {conversations.length === 0 ? (
              <div className={styles.historyEmpty}>暂无历史对话</div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`${styles.historyItem} ${
                    conversationId === conv.id ? styles.historyItemActive : ""
                  }`}
                  onClick={() => handleSelectConversation(conv)}
                >
                  <div className={styles.historyItemTitle}>{conv.title}</div>
                  <div className={styles.historyItemMeta}>
                    <span>
                      {new Date(conv.updated_at).toLocaleDateString()}
                    </span>
                    <Button
                      type="text"
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteConversation(conv.id);
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className={styles.messages}>
        {messages.length === 0 && (
          <div className={styles.welcomeMessage}>
            <RobotOutlined className={styles.welcomeIcon} />
            <div className={styles.welcomeTitle}>
              {activeScene?.icon} {activeScene?.name}
            </div>
            <div className={styles.welcomeDesc}>
              {activeScene?.description}
            </div>
            <div className={styles.welcomeHint}>
              请描述你的需求，或点击上方快捷按钮开始
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`${styles.message} ${
              msg.role === "user" ? styles.messageUser : styles.messageAssistant
            }`}
          >
            <div className={styles.messageAvatar}>
              {msg.role === "user" ? <UserOutlined /> : <RobotOutlined />}
            </div>
            <div className={styles.messageContent}>
              <div className={styles.messageRole}>
                {msg.role === "user" ? "你" : "AI"}
              </div>
              <div className={styles.messageText}>
                {msg.content || (
                  <div className={styles.toolCallPlaceholder}>
                    <ToolOutlined /> 正在处理...
                  </div>
                )}
              </div>
              {/* Render tool calls if present */}
              {msg.toolInvocations?.map((tool: any, index: number) => (
                <Card
                  key={index}
                  size="small"
                  className={styles.toolCallCard}
                  title={
                    <Space>
                      <ToolOutlined />
                      <span>{tool.toolName}</span>
                    </Space>
                  }
                >
                  {tool.state === "result" ? (
                    <ToolResultDisplay result={tool.result} />
                  ) : (
                    <Spin size="small" />
                  )}
                </Card>
              ))}
            </div>
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className={`${styles.message} ${styles.messageAssistant}`}>
            <div className={styles.messageAvatar}>
              <RobotOutlined />
            </div>
            <div className={styles.messageContent}>
              <Spin size="small" />
            </div>
          </div>
        )}

        {error && (
          <div className={styles.errorBanner}>
            <Text type="danger">{error.message}</Text>
            <Button size="small" onClick={() => handleSendMessage()}>
              重试
            </Button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className={styles.inputArea}>
        <Input.TextArea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="输入消息..."
          autoSize={{ minRows: 1, maxRows: 4 }}
          disabled={isLoading}
          onPressEnter={(e) => {
            if (!e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
        />
        <Space>
          {isLoading ? (
            <Button
              type="primary"
              danger
              icon={<StopOutlined />}
              onClick={stop}
            >
              停止
            </Button>
          ) : (
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSendMessage}
              disabled={!inputText.trim()}
            >
              发送
            </Button>
          )}
        </Space>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tool Result Display
// ---------------------------------------------------------------------------

function ToolResultDisplay({ result }: { result: any }) {
  if (!result) return null;

  if (result.actionType === "evaluation" && result.evaluation) {
    const { score, summary, highlights, concerns } = result.evaluation;
    return (
      <div className={styles.evaluationResult}>
        <div className={styles.evaluationScore}>
          <Text strong>评分: </Text>
          <Tag color={score >= 80 ? "green" : score >= 60 ? "orange" : "red"}>
            {score}/100
          </Tag>
        </div>
        <Paragraph>{summary}</Paragraph>
        {highlights?.length > 0 && (
          <div>
            <Text type="success">亮点:</Text>
            <ul>
              {highlights.map((h: string, i: number) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          </div>
        )}
        {concerns?.length > 0 && (
          <div>
            <Text type="warning">关注点:</Text>
            <ul>
              {concerns.map((c: string, i: number) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  if (result.actionType === "propose_update") {
    return (
      <div className={styles.proposeUpdate}>
        <div className={styles.proposeUpdateHeader}>
          <Text strong>建议修改: {result.field}</Text>
          <Tag>{result.targetType}</Tag>
        </div>
        <Paragraph type="secondary">{result.reason}</Paragraph>
        <div className={styles.proposeUpdateContent}>
          <pre>{result.content}</pre>
        </div>
        <Space>
          <Button type="primary" size="small">
            采纳
          </Button>
          <Button size="small">拒绝</Button>
        </Space>
      </div>
    );
  }

  if (result.actionType === "suggestion") {
    return (
      <div className={styles.suggestion}>
        <Tag
          color={
            result.priority === "high"
              ? "red"
              : result.priority === "medium"
              ? "orange"
              : "blue"
          }
        >
          {result.priority === "high"
            ? "高优先级"
            : result.priority === "medium"
            ? "中优先级"
            : "低优先级"}
        </Tag>
        <Paragraph>{result.suggestion}</Paragraph>
      </div>
    );
  }

  // Default display
  return (
    <pre className={styles.toolResultDefault}>
      {JSON.stringify(result, null, 2)}
    </pre>
  );
}
