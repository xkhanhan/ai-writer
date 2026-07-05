"use client";

import { Button, Tag, Space, Typography } from "antd";
import { ApiOutlined, CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined } from "@ant-design/icons";

const { Text } = Typography;

interface ConnectionTestProps {
  status: "idle" | "testing" | "success" | "error";
  message: string;
  disabled: boolean;
  onTest: () => void;
}

export default function ConnectionTest({ status, message, disabled, onTest }: ConnectionTestProps) {
  const statusConfig = {
    idle: { color: "default", icon: null, text: "未测试" },
    testing: { color: "processing", icon: <LoadingOutlined />, text: "测试中..." },
    success: { color: "success", icon: <CheckCircleOutlined />, text: "已连接" },
    error: { color: "error", icon: <CloseCircleOutlined />, text: "连接失败" },
  };

  const config = statusConfig[status];

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Space>
        <Button
          type="primary"
          icon={<ApiOutlined />}
          onClick={onTest}
          loading={status === "testing"}
          disabled={disabled}
        >
          测试连接
        </Button>
        <Tag color={config.color} icon={config.icon}>
          {config.text}
        </Tag>
      </Space>
      {message && (
        <Text type={status === "error" ? "danger" : status === "success" ? "success" : "secondary"}>
          {message}
        </Text>
      )}
    </Space>
  );
}
