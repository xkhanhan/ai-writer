"use client";

import { useState } from "react";
import { Button, Tag } from "antd";
import {
  EditOutlined,
  ApiOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  MinusCircleOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
} from "@ant-design/icons";
import type { StoredConfig } from "../hooks/use-config-list";
import styles from "../index.module.css";

interface ConfigDetailProps {
  config: StoredConfig;
  onEdit: (config: StoredConfig) => void;
}

const STATUS_MAP: Record<
  StoredConfig["status"],
  { color: string; label: string; icon: React.ReactNode }
> = {
  idle: {
    color: "default",
    label: "未测试",
    icon: <MinusCircleOutlined />,
  },
  connected: {
    color: "success",
    label: "已连接",
    icon: <CheckCircleOutlined />,
  },
  error: {
    color: "error",
    label: "连接失败",
    icon: <CloseCircleOutlined />,
  },
};

export default function ConfigDetail({ config, onEdit }: ConfigDetailProps) {
  const statusInfo = STATUS_MAP[config.status];
  const [showApiKey, setShowApiKey] = useState(false);

  const maskedKey = config.apiKey ? "••••••••" + config.apiKey.slice(-4) : "未设置";

  const fields = [
    { label: "厂商", value: config.providerName || config.provider },
    { label: "API 格式", value: config.apiFormat },
    { label: "Base URL", value: config.baseUrl, mono: true },
    {
      label: "API Key",
      value: showApiKey ? (config.apiKey || "未设置") : maskedKey,
      mono: true,
      isApiKey: true,
    },
    { label: "模型", value: config.model || "—" },
    { label: "上下文大小", value: config.contextSize.toLocaleString() + " tokens" },
    { label: "温度", value: String(config.temperature) },
  ];

  return (
    <div className={styles.detailContainer}>
      <div className={styles.detailHeader}>
        <div className={styles.detailHeaderLeft}>
          <ApiOutlined className={styles.detailHeaderIcon} />
          <div>
            <h3 className={styles.detailTitle}>{config.name}</h3>
            <p className={styles.detailSubtitle}>{config.providerName || config.provider}</p>
          </div>
        </div>
        <div className={styles.detailHeaderRight}>
          <Tag color={statusInfo.color} icon={statusInfo.icon} className={styles.detailStatus}>
            {statusInfo.label}
          </Tag>
          <Button
            icon={<EditOutlined />}
            onClick={() => onEdit(config)}
            size="small"
            aria-label="编辑配置"
          >
            编辑
          </Button>
        </div>
      </div>

      <div className={styles.detailGrid}>
        {fields.map((field) => (
          <div className={styles.detailField} key={field.label}>
            <span className={styles.detailLabel}>{field.label}</span>
            <span
              className={`${styles.detailValue} ${field.mono ? styles.detailValueMono : ""}`}
            >
              {field.isApiKey ? (
                <span className={styles.detailApiKeyRow}>
                  <span>{field.value}</span>
                  {config.apiKey && (
                    <button
                      type="button"
                      className={styles.detailApiKeyToggle}
                      onClick={() => setShowApiKey((v) => !v)}
                      aria-label={showApiKey ? "隐藏 API Key" : "显示 API Key"}
                    >
                      {showApiKey ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                    </button>
                  )}
                </span>
              ) : (
                field.value
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
