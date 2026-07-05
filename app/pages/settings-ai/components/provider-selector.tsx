"use client";

import { Form, Select } from "antd";
import { AI_PROVIDERS } from "../config/providers";
import type { AiProvider } from "../config/providers";

interface ProviderSelectorProps {
  value: string;
  onChange: (providerId: string, provider: AiProvider) => void;
}

export default function ProviderSelector({ value, onChange }: ProviderSelectorProps) {
  const handleChange = (providerId: string) => {
    const provider = AI_PROVIDERS.find((p) => p.id === providerId);
    if (provider) {
      onChange(providerId, provider);
    }
  };

  return (
    <Form.Item label="厂商选择" required>
      <Select
        value={value}
        onChange={handleChange}
        placeholder="请选择 AI 厂商"
        options={AI_PROVIDERS.map((p) => ({
          value: p.id,
          label: p.name,
        }))}
        showSearch
        filterOption={(input, option) =>
          (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
        }
      />
    </Form.Item>
  );
}
