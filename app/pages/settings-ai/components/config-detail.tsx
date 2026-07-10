"use client";

import { Button, Tag } from "antd";
import {
  EditOutlined,
  ApiOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  MinusCircleOutlined,
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

  const fields = [
    { label: "厂商", value: config.providerName || config.provider },
    { label: "API 格式", value: config.apiFormat },
    { label: "Base URL", value: config.baseUrl, mono: true },
    {
      label: "API Key",
      value: config.apiKey ? "••••••••" + config.apiKey.slice(-4) : "未设置",
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
              {field.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
