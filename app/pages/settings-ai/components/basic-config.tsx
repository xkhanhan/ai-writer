"use client";

import { Form, Input, Select, Slider, InputNumber, Button, Row, Col, message } from "antd";
import { EyeOutlined, EyeInvisibleOutlined, ReloadOutlined } from "@ant-design/icons";
import { useState } from "react";
import type { AiProvider } from "../config/providers";

interface BasicConfigProps {
  provider: AiProvider;
  apiFormat: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  availableModels: string[];
  contextSize: number;
  temperature: number;
  modelsLoading: boolean;
  onApiFormatChange: (format: string) => void;
  onBaseUrlChange: (url: string) => void;
  onApiKeyChange: (key: string) => void;
  onModelChange: (model: string) => void;
  onContextSizeChange: (size: number) => void;
  onTemperatureChange: (temp: number) => void;
  onFetchModels: () => void;
}

export default function BasicConfig({
  provider,
  apiFormat,
  baseUrl,
  apiKey,
  model,
  availableModels,
  contextSize,
  temperature,
  modelsLoading,
  onApiFormatChange,
  onBaseUrlChange,
  onApiKeyChange,
  onModelChange,
  onContextSizeChange,
  onTemperatureChange,
  onFetchModels,
}: BasicConfigProps) {
  const [showApiKey, setShowApiKey] = useState(false);

  const canFetchModels = Boolean(provider.id && baseUrl && apiKey);

  const handleFetchModels = () => {
    if (!canFetchModels) {
      message.warning("请先填写厂商、Base URL 和 API Key");
      return;
    }
    onFetchModels();
  };

  const modelOptions = availableModels.length > 0
    ? availableModels.map((m) => ({ value: m, label: m }))
    : provider.models.map((m) => ({ value: m, label: m }));

  return (
    <>
      <Row gutter={16}>
        <Col xs={24} sm={12}>
          <Form.Item label="API 格式" required>
            <Select
              value={apiFormat}
              onChange={onApiFormatChange}
              options={[
                { value: "openai", label: "OpenAI Compatible" },
                { value: "anthropic", label: "Anthropic" },
                { value: "custom", label: "自定义" },
              ]}
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item label="Base URL" required>
            <Input
              value={baseUrl}
              onChange={(e) => onBaseUrlChange(e.target.value)}
              placeholder="https://api.openai.com/v1"
            />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item label="API Key" required>
        <Input
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          placeholder="sk-..."
          type={showApiKey ? "text" : "password"}
          suffix={
            <Button
              type="text"
              icon={showApiKey ? <EyeOutlined /> : <EyeInvisibleOutlined />}
              onClick={() => setShowApiKey(!showApiKey)}
              size="small"
              tabIndex={-1}
            />
          }
        />
      </Form.Item>

      <Form.Item label="模型选择" required>
        <Input.Group compact>
          <Select
            value={model ? [model] : []}
            onChange={(val) => {
              const v = Array.isArray(val) ? (val[val.length - 1] ?? "") : (val ?? "");
              onModelChange(typeof v === "string" ? v : String(v));
            }}
            placeholder="选择或输入模型"
            options={modelOptions}
            style={{ width: "calc(100% - 120px)" }}
            showSearch
            allowClear
            mode="tags"
            maxCount={1}
            tokenSeparators={[","]}
            filterOption={(input, option) =>
              (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
            }
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={handleFetchModels}
            loading={modelsLoading}
            disabled={!canFetchModels}
            style={{ width: 120 }}
          >
            拉取模型
          </Button>
        </Input.Group>
      </Form.Item>

      <Row gutter={16}>
        <Col xs={24} sm={12}>
          <Form.Item label="上下文大小">
            <InputNumber
              value={contextSize}
              onChange={(v) => onContextSizeChange(v ?? 4096)}
              min={1}
              step={1}
              precision={0}
              style={{ width: "100%" }}
              placeholder="输入上下文大小(支持K/M)"
              addonAfter="tokens"
              formatter={(value) => {
                if (value === undefined || value === null) return "";
                const num = Number(value);
                if (Number.isNaN(num)) return String(value);
                if (num % 1_000_000 === 0) return `${num / 1_000_000}M`;
                if (num % 1_000 === 0) return `${num / 1_000}K`;
                return new Intl.NumberFormat().format(num);
              }}
              parser={(text) => {
                if (!text) return 0 as unknown as number;
                const t = text.trim().toUpperCase();
                const m = /^([0-9]*\.?[0-9]+)\s*([KM])?$/.exec(t);
                const n = m ? parseFloat(m[1]) : parseFloat(t.replace(/[^0-9.-]/g, ""));
                if (Number.isNaN(n)) return 0 as unknown as number;
                const suffix = m?.[2];
                const val = suffix === "M" ? n * 1_000_000 : suffix === "K" ? n * 1_000 : n;
                return Math.round(val) as unknown as number;
              }}
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item
            label={`温度 (${provider.temperatureRange[0]}-${provider.temperatureRange[1]})`}
          >
            <Input.Group compact>
              <Slider
                value={temperature}
                onChange={onTemperatureChange}
                min={provider.temperatureRange[0]}
                max={provider.temperatureRange[1]}
                step={0.1}
                style={{ width: "calc(100% - 80px)", marginRight: 0 }}
              />
              <InputNumber
                value={temperature}
                onChange={(v) => {
                  if (v !== null) {
                    const clamped = Math.max(
                      provider.temperatureRange[0],
                      Math.min(provider.temperatureRange[1], v)
                    );
                    onTemperatureChange(clamped);
                  }
                }}
                min={provider.temperatureRange[0]}
                max={provider.temperatureRange[1]}
                step={0.1}
                style={{ width: 80 }}
              />
            </Input.Group>
          </Form.Item>
        </Col>
      </Row>
    </>
  );
}
