"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Form, Input, InputNumber, Select, Slider, Tooltip, message } from "antd";
import { CloudDownloadOutlined, ApiOutlined } from "@ant-design/icons";
import { AI_PROVIDERS } from "@/shared/ai/providers";
import type { StoredConfig } from "../hooks/use-config-list";
import BaseModal from "@/shared/ui/base-modal";
import baseModalStyles from "@/shared/ui/base-modal/index.module.css";
import styles from "../index.module.css";

interface ConfigModalProps {
  open: boolean;
  editingConfig: StoredConfig | null;
  onClose: () => void;
  onSave: (config: Omit<StoredConfig, "id" | "status">) => void;
}

const PROVIDER_MAP = new Map(
  AI_PROVIDERS.map((p) => [
    p.id,
    {
      name: p.name,
      baseUrl: p.baseUrl,
      apiFormat: p.apiFormat,
      defaultModel: p.defaultModel,
      maxContextSize: p.maxContextSize,
      temperatureRange: p.temperatureRange,
      models: p.models,
    },
  ]),
);

const FORM_INITIAL: Omit<StoredConfig, "id" | "status" | "updatedAt"> = {
  name: "",
  provider: "openai",
  providerName: "OpenAI",
  apiFormat: "openai",
  baseUrl: "https://api.openai.com/v1",
  apiKey: "",
  model: "gpt-4o-mini",
  contextSize: 128000,
  temperature: 0.7,
};

/**
 * Custom component that bridges Form.Item with Slider + InputNumber.
 * Form.Item injects value/onChange into the direct child component,
 * so we need a wrapper that forwards these to both controls.
 */
function TemperatureInput({
  value,
  onChange,
  max = 2,
}: {
  value?: number;
  onChange?: (val: number) => void;
  max?: number;
}) {
  const current = value ?? 0.7;
  return (
    <div className={styles.modelRow}>
      <Slider
        min={0}
        max={max}
        step={0.1}
        value={current}
        onChange={onChange}
        className={styles.modelRowSelect}
      />
      <InputNumber
        min={0}
        max={max}
        step={0.1}
        value={current}
        onChange={(v) => onChange?.(v ?? 0)}
        style={{ width: 72 }}
      />
    </div>
  );
}

export default function ConfigModal({
  open,
  editingConfig,
  onClose,
  onSave,
}: ConfigModalProps) {
  const [form] = Form.useForm();
  const watchedProvider = Form.useWatch("provider", form) ?? "openai";
  const watchedApiKey = Form.useWatch("apiKey", form) as string | undefined;
  const watchedBaseUrl = Form.useWatch("baseUrl", form) as string | undefined;
  const [testing, setTesting] = useState(false);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [fetchedModels, setFetchedModels] = useState<string[] | null>(null);

  useEffect(() => {
    if (open) {
      if (editingConfig) {
        form.setFieldsValue(editingConfig);
      } else {
        form.setFieldsValue(FORM_INITIAL);
      }
    }
  }, [open, editingConfig, form]);

  const handleProviderChange = useCallback(
    (providerId: string) => {
      const info = PROVIDER_MAP.get(providerId);
      if (!info) return;
      setFetchedModels(null);
      form.setFieldsValue({
        providerName: info.name,
        apiFormat: info.apiFormat,
        baseUrl: info.baseUrl,
        model: info.defaultModel,
        contextSize: info.maxContextSize,
        temperature:
          (info.temperatureRange[0] + info.temperatureRange[1]) / 2,
      });
    },
    [form],
  );

  const handleFetchModels = useCallback(async () => {
    const key = form.getFieldValue("apiKey") as string | undefined;
    const url = form.getFieldValue("baseUrl") as string | undefined;
    const providerId = form.getFieldValue("provider") as string | undefined;
    if (!key || !url) {
      message.warning("请先填写 API Key 和 Base URL");
      return;
    }

    setFetchingModels(true);
    setFetchedModels(null);
    try {
      const res = await fetch("/api/ai/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId, baseUrl: url, apiKey: key }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        message.error(data.error ?? "模型拉取失败");
        return;
      }
      const models: string[] = data.models ?? [];
      setFetchedModels(models);
      message.success(`成功拉取 ${models.length} 个模型`);
    } catch {
      message.error("模型拉取失败，请检查网络连接");
    } finally {
      setFetchingModels(false);
    }
  }, [form]);

  const handleTestConnection = useCallback(async () => {
    const key = form.getFieldValue("apiKey") as string | undefined;
    const url = form.getFieldValue("baseUrl") as string | undefined;
    if (!key || !url) {
      message.warning("请先填写 API Key 和 Base URL");
      return;
    }
    setTesting(true);
    try {
      const testUrl = `${url.replace(/\/+$/, "")}/models`;
      const res = await fetch(testUrl, {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (res.ok) {
        message.success("连接测试成功");
      } else {
        message.error(`连接测试失败 (HTTP ${res.status})`);
      }
    } catch {
      message.error("连接测试失败，请检查网络和配置");
    } finally {
      setTesting(false);
    }
  }, [form]);

  const handleOk = useCallback(async () => {
    const values = await form.validateFields();
    const info = PROVIDER_MAP.get(values.provider);

    // Auto-test connection before saving
    setTesting(true);
    try {
      const testUrl = `${values.baseUrl.replace(/\/+$/, "")}/models`;
      const res = await fetch(testUrl, {
        headers: { Authorization: `Bearer ${values.apiKey}` },
      });
      if (!res.ok) {
        message.error(`连接测试失败 (HTTP ${res.status})，请检查 Base URL 和 API Key`);
        return;
      }
    } catch {
      message.error("连接测试失败，请检查网络、Base URL 和 API Key");
      return;
    } finally {
      setTesting(false);
    }

    onSave({
      ...values,
      providerName: info?.name ?? values.provider,
    });
    onClose();
  }, [form, onSave, onClose]);

  const providerInfo = PROVIDER_MAP.get(watchedProvider);

  return (
    <BaseModal
      open={open}
      title={editingConfig ? "编辑 AI 配置" : "新建 AI 配置"}
      onCancel={onClose}
      onOk={handleOk}
      okText={editingConfig ? "保存" : "创建并保存"}
      confirmLoading={testing}
      width={560}
      destroyOnClose
      footer={
        <div className={baseModalStyles.modalFooter}>
          <Button onClick={onClose}>取消</Button>
          <Button
            icon={<ApiOutlined />}
            loading={testing}
            onClick={() => void handleTestConnection()}
          >
            测试连接
          </Button>
          <Button type="primary" loading={testing} onClick={() => void handleOk()}>
            {editingConfig ? "保存" : "创建并保存"}
          </Button>
        </div>
      }
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark="optional"
        className={styles.modalForm}
      >
        <Form.Item
          name="name"
          label="配置名称"
          rules={[{ required: true, message: "请输入配置名称" }]}
        >
          <Input placeholder="例如：主力模型" />
        </Form.Item>

        <Form.Item name="provider" label="厂商选择" required>
          <Select
            onChange={handleProviderChange}
            options={AI_PROVIDERS.map((p) => ({
              value: p.id,
              label: p.name,
            }))}
            showSearch
            filterOption={(input, option) =>
              (option?.label as string)
                ?.toLowerCase()
                .includes(input.toLowerCase())
            }
          />
        </Form.Item>

        <Form.Item name="apiFormat" label="API 格式" required>
          <Select
            options={[
              { value: "openai", label: "OpenAI Compatible" },
              { value: "anthropic", label: "Anthropic" },
              { value: "custom", label: "自定义" },
            ]}
          />
        </Form.Item>
        <Form.Item name="providerName" label="厂商名称" hidden>
          <Input />
        </Form.Item>

        <Form.Item
          name="baseUrl"
          label="Base URL"
          rules={[{ required: true, message: "请输入 Base URL" }]}
        >
          <Input placeholder="https://api.example.com/v1" />
        </Form.Item>

        <Form.Item
          name="apiKey"
          label="API Key"
          rules={[{ required: true, message: "请输入 API Key" }]}
        >
          <Input.Password placeholder="sk-..." />
        </Form.Item>

        <Form.Item name="model" label="模型" required>
          <div className={styles.modelRow}>
            <Select
              showSearch
              placeholder="选择模型"
              className={styles.modelRowSelect}
              options={
                fetchedModels
                  ? fetchedModels.map((m) => ({ value: m, label: m }))
                  : providerInfo
                    ? (() => {
                        const models = providerInfo.models.map((m) => ({ value: m, label: m }));
                        // Ensure the current model is in the options (for edit mode)
                        const currentModel = editingConfig?.model;
                        if (currentModel && !models.some((m) => m.value === currentModel)) {
                          models.unshift({ value: currentModel, label: currentModel });
                        }
                        return models;
                      })()
                    : []
              }
              filterOption={(input, option) =>
                (option?.label as string)
                  ?.toLowerCase()
                  .includes(input.toLowerCase())
              }
            />
            <Tooltip title={!watchedApiKey || !watchedBaseUrl ? "请先填写 API Key 和 Base URL" : ""}>
              <Button
                icon={<CloudDownloadOutlined />}
                className={styles.fetchModelButton}
                onClick={() => void handleFetchModels()}
                loading={fetchingModels}
                disabled={fetchingModels}
              >
                拉取模型
              </Button>
            </Tooltip>
          </div>
        </Form.Item>

        <Form.Item name="contextSize" label="上下文大小 (tokens)">
          <InputNumber
            min={1024}
            max={1000000}
            step={1024}
            className={styles.modalInputFull}
            formatter={(value) =>
              `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
            }
          />
        </Form.Item>

        <Form.Item name="temperature" label="温度">
          <TemperatureInput
            max={providerInfo?.temperatureRange[1] ?? 2}
          />
        </Form.Item>
      </Form>
    </BaseModal>
  );
}
