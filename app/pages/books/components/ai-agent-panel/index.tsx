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
  FileTextOutlined,
  BookOutlined,
  EditOutlined,
  HighlightOutlined,
  ClearOutlined,
  ReadOutlined,
  SearchOutlined,
  BulbOutlined,
  FormOutlined,
} from "@ant-design/icons";
import { useAiContext } from "../../context/ai-context";
import {
  AGENT_UI_TEXT,
  SCORE_THRESHOLD_EXCELLENT,
  SCORE_THRESHOLD_GOOD,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
} from "@/shared/constants/agent-ui";
import styles from "./index.module.css";

const { Text, Paragraph } = Typography;

// ---------------------------------------------------------------------------
// Icon Map
// ---------------------------------------------------------------------------

const ICON_MAP: Record<string, React.ReactNode> = {
  FileTextOutlined: <FileTextOutlined />,
  BookOutlined: <BookOutlined />,
  EditOutlined: <EditOutlined />,
  HighlightOutlined: <HighlightOutlined />,
  ClearOutlined: <ClearOutlined />,
  ReadOutlined: <ReadOutlined />,
  ThunderboltOutlined: <ThunderboltOutlined />,
  SearchOutlined: <SearchOutlined />,
  BulbOutlined: <BulbOutlined />,
  FormOutlined: <FormOutlined />,
};

function getIcon(iconName: string): React.ReactNode {
  return ICON_MAP[iconName] || <ThunderboltOutlined />;
}

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
      message.error(err.message || AGENT_UI_TEXT.CHAT_ERROR);
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
      message.success(AGENT_UI_TEXT.CONVERSATION_DELETED);
    } catch (err) {
      message.error(AGENT_UI_TEXT.DELETE_FAILED);
    }
  };

  // Empty state
  if (scenes.length === 0) {
    return (
      <div className={styles.emptyState}>
        <RobotOutlined className={styles.emptyIcon} />
        <div className={styles.emptyTitle}>{AGENT_UI_TEXT.PANEL_TITLE}</div>
        <div className={styles.emptyDesc}>{AGENT_UI_TEXT.LOADING}</div>
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
            label: (
              <Space>
                {getIcon(s.icon)}
                <span>{s.name}</span>
              </Space>
            ),
            value: s.id,
          }))}
        />
        <Space>
          <Tooltip title={AGENT_UI_TEXT.HISTORY}>
            <Button
              type="text"
              icon={<HistoryOutlined />}
              onClick={() => setShowHistory(!showHistory)}
            />
          </Tooltip>
          <Tooltip title={AGENT_UI_TEXT.NEW_CONVERSATION}>
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
              icon={getIcon(action.icon)}
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
            <Text strong>{AGENT_UI_TEXT.HISTORY}</Text>
            <Button
              type="text"
              size="small"
              onClick={() => setShowHistory(false)}
            >
              {AGENT_UI_TEXT.CLOSE}
            </Button>
          </div>
          <div className={styles.historyList}>
            {conversations.length === 0 ? (
              <div className={styles.historyEmpty}>{AGENT_UI_TEXT.NO_CONVERSATIONS}</div>
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
              {activeScene && getIcon(activeScene.icon)} {activeScene?.name}
            </div>
            <div className={styles.welcomeDesc}>
              {activeScene?.description}
            </div>
            <div className={styles.welcomeHint}>
              {AGENT_UI_TEXT.WELCOME_HINT}
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
                {msg.role === "user" ? AGENT_UI_TEXT.ROLE_USER : AGENT_UI_TEXT.ROLE_AI}
              </div>
              <div className={styles.messageText}>
                {msg.content || (
                  <div className={styles.toolCallPlaceholder}>
                    <ToolOutlined /> {AGENT_UI_TEXT.PROCESSING}
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
              {AGENT_UI_TEXT.RETRY}
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
          placeholder={`${AGENT_UI_TEXT.SEND}...`}
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
              {AGENT_UI_TEXT.STOP}
            </Button>
          ) : (
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSendMessage}
              disabled={!inputText.trim()}
            >
              {AGENT_UI_TEXT.SEND}
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
          <Text strong>{AGENT_UI_TEXT.SCORE_LABEL} </Text>
          <Tag color={score >= SCORE_THRESHOLD_EXCELLENT ? "green" : score >= SCORE_THRESHOLD_GOOD ? "orange" : "red"}>
            {score}/100
          </Tag>
        </div>
        <Paragraph>{summary}</Paragraph>
        {highlights?.length > 0 && (
          <div>
            <Text type="success">{AGENT_UI_TEXT.HIGHLIGHTS_LABEL}</Text>
            <ul>
              {highlights.map((h: string, i: number) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          </div>
        )}
        {concerns?.length > 0 && (
          <div>
            <Text type="warning">{AGENT_UI_TEXT.CONCERNS_LABEL}</Text>
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
          <Text strong>{AGENT_UI_TEXT.SUGGEST_MODIFY} {result.field}</Text>
          <Tag>{result.targetType}</Tag>
        </div>
        <Paragraph type="secondary">{result.reason}</Paragraph>
        <div className={styles.proposeUpdateContent}>
          <pre>{result.content}</pre>
        </div>
        <Space>
          <Button type="primary" size="small">
            {AGENT_UI_TEXT.ADOPT}
          </Button>
          <Button size="small">{AGENT_UI_TEXT.REJECT}</Button>
        </Space>
      </div>
    );
  }

  if (result.actionType === "suggestion") {
    return (
      <div className={styles.suggestion}>
        <Tag
          color={PRIORITY_COLORS[result.priority] ?? PRIORITY_COLORS.medium}
        >
          {PRIORITY_LABELS[result.priority] ?? PRIORITY_LABELS.medium}
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
