"use client";

import { useCallback } from "react";
import { Button, Card, Space, Typography, Spin } from "antd";
import {
  CheckOutlined,
  ReloadOutlined,
  StopOutlined,
  CopyOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import type { StreamResult } from "../../../../hooks/use-ai-panel";
import { AGENT_UI_TEXT } from "@/shared/constants/agent-ui";
import styles from "./index.module.css";

const { Text, Paragraph } = Typography;

interface ResultCardProps {
  result: StreamResult;
  onAdopt: () => void;
  onReset: () => void;
  onStop: () => void;
  isGenerating: boolean;
}

export function ResultCard({
  result,
  onAdopt,
  onReset,
  onStop,
  isGenerating,
}: ResultCardProps) {
  const handleCopy = useCallback(() => {
    if (result.text) {
      navigator.clipboard.writeText(result.text);
    }
  }, [result.text]);

  const handleDownload = useCallback(() => {
    if (result.text) {
      const blob = new Blob([result.text], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ai-result.txt";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [result.text]);

  if (!result.text && !result.isStreaming) {
    return null;
  }

  return (
    <Card
      className={styles.card}
      title={
        <Space>
          <Text strong>AI 生成结果</Text>
          {result.isStreaming && <Spin size="small" />}
          {result.isComplete && (
            <Text type="success" className={styles.completeText}>
              生成完成
            </Text>
          )}
        </Space>
      }
      extra={
        <Space>
          <Button
            type="text"
            size="small"
            icon={<CopyOutlined />}
            onClick={handleCopy}
            disabled={!result.text}
          />
          <Button
            type="text"
            size="small"
            icon={<DownloadOutlined />}
            onClick={handleDownload}
            disabled={!result.text}
          />
        </Space>
      }
    >
      <div className={styles.content}>
        {result.text ? (
          <Paragraph className={styles.text}>{result.text}</Paragraph>
        ) : (
          <div className={styles.empty}>
            <Spin size="small" />
            <Text type="secondary">{AGENT_UI_TEXT.GENERATING}</Text>
          </div>
        )}

        {result.isStreaming && (
          <div className={styles.streamingIndicator}>
            <span className={styles.cursor} />
          </div>
        )}
      </div>

      {result.error && (
        <div className={styles.error}>
          <Text type="danger">{result.error.message}</Text>
        </div>
      )}

      <div className={styles.actions}>
        <Space>
          {isGenerating ? (
            <Button
              danger
              icon={<StopOutlined />}
              onClick={onStop}
              size="small"
            >
              {AGENT_UI_TEXT.STOP}
            </Button>
          ) : (
            <>
              <Button
                icon={<ReloadOutlined />}
                onClick={onReset}
                size="small"
              >
                重新生成
              </Button>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                onClick={onAdopt}
                disabled={!result.text || result.isStreaming}
                size="small"
              >
                {AGENT_UI_TEXT.ADOPT}
              </Button>
            </>
          )}
        </Space>
      </div>
    </Card>
  );
}