"use client";

import { Form, Input, Tag, Typography } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";

const { TextArea } = Input;
const { Text } = Typography;

interface AdvancedJsonProps {
  value: string;
  valid: boolean;
  error: string;
  onChange: (json: string) => void;
}

export default function AdvancedJson({ value, valid, error, onChange }: AdvancedJsonProps) {
  return (
    <>
      <Form.Item>
        <Tag
          color={valid ? "success" : "warning"}
          icon={valid ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
        >
          JSON 状态：{valid ? "有效" : "无效"}
        </Tag>
        {!valid && error && (
          <Text type="danger" style={{ marginLeft: 8 }}>
            {error}
          </Text>
        )}
      </Form.Item>

      <Form.Item
        extra="修改 baseUrl、model、temperature、maxTokens 时会同步到基础配置。"
      >
        <TextArea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={12}
          placeholder='{"baseUrl": "", "model": "", "temperature": 0.7}'
          spellCheck={false}
          style={{
            fontFamily: "'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace",
            fontSize: 13,
            lineHeight: 1.6,
          }}
        />
      </Form.Item>
    </>
  );
}
