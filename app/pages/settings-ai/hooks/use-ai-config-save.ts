"use client";

import { useState, useCallback } from "react";
import { showError, showSuccess } from "@/app/utils/error-handler";
import { saveAiConfig as saveAiConfigApi } from "../api/ai-config";

export interface UseAiConfigSaveReturn {
  saving: boolean;
  handleSave: (params: {
    providerId: string;
    apiKey: string;
    baseUrl: string;
    model: string;
    contextSize: number;
    temperature: number;
    jsonValid: boolean;
    advancedJson: string;
  }) => Promise<void>;
}

export function useAiConfigSave(): UseAiConfigSaveReturn {
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(
    async (params: {
      providerId: string;
      apiKey: string;
      baseUrl: string;
      model: string;
      contextSize: number;
      temperature: number;
      jsonValid: boolean;
      advancedJson: string;
    }) => {
      setSaving(true);

      let advancedConfig: Record<string, unknown> | undefined;

      if (params.jsonValid && params.advancedJson) {
        try {
          advancedConfig = JSON.parse(
            params.advancedJson
          ) as Record<string, unknown>;
        } catch (parseError) {
          const msg =
            parseError instanceof Error
              ? parseError.message
              : "高级配置 JSON 解析失败";
          showError(msg);
          setSaving(false);
          return;
        }
      }

      const result = await saveAiConfigApi({
        providerId: params.providerId,
        apiKey: params.apiKey || undefined,
        baseUrl: params.baseUrl,
        model: params.model,
        contextSize: params.contextSize,
        temperature: params.temperature,
        advancedConfig,
      });

      if (result.ok) {
        showSuccess("配置保存成功");
      } else {
        showError(result.error || "保存配置失败");
      }
      setSaving(false);
    },
    []
  );

  return { saving, handleSave };
}
