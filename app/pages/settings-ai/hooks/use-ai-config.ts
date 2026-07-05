"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { AiConfig } from "@/app/types";
import { handleApiError, showSuccess } from "@/app/utils/error-handler";
import {
  saveAiConfig as saveAiConfigApi,
  fetchModels as fetchModelsApi,
  testConnection as testConnectionApi,
} from "../api/ai-config";
import { getProviderById, getDefaultProvider } from "../config/providers";
import type { AiProvider } from "../config/providers";
import { validateJsonString } from "../utils/json-security";
import { syncToAdvancedJson, syncFromAdvancedJson } from "../utils/json-sync";

interface AiConfigState {
  providerId: string;
  provider: AiProvider;
  apiFormat: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  contextSize: number;
  temperature: number;
  availableModels: string[];
  modelsLoading: boolean;
  testStatus: "idle" | "testing" | "success" | "error";
  testMessage: string;
  advancedJson: string;
  jsonValid: boolean;
  jsonError: string;
  saving: boolean;
}

export function useAiConfig(initialConfig?: AiConfig | null) {
  const defaultProvider = getDefaultProvider();

  const [state, setState] = useState<AiConfigState>({
    providerId: initialConfig?.providerId ?? defaultProvider.id,
    provider: getProviderById(initialConfig?.providerId ?? defaultProvider.id) ?? defaultProvider,
    apiFormat: "openai",
    baseUrl: initialConfig?.baseUrl ?? defaultProvider.baseUrl,
    apiKey: "",
    model: initialConfig?.model ?? defaultProvider.defaultModel,
    contextSize: initialConfig?.contextSize ?? defaultProvider.maxContextSize,
    temperature: initialConfig?.temperature ?? 0.7,
    availableModels: [],
    modelsLoading: false,
    testStatus: "idle",
    testMessage: "",
    advancedJson: initialConfig?.advancedConfig
      ? JSON.stringify(initialConfig.advancedConfig, null, 2)
      : "",
    jsonValid: true,
    jsonError: "",
    saving: false,
  });

  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);



  const syncFromJson = useCallback((json: string) => {
    const result = syncFromAdvancedJson(json);
    if (result) {
      setState((prev) => ({
        ...prev,
        baseUrl: result.baseUrl ?? prev.baseUrl,
        model: result.model ?? prev.model,
        contextSize: result.contextSize ?? prev.contextSize,
        temperature: result.temperature ?? prev.temperature,
      }));
    }
  }, []);

  const handleProviderChange = useCallback(
    (providerId: string, provider: AiProvider) => {
      setState((prev) => ({
        ...prev,
        providerId,
        provider,
        apiFormat: provider.apiFormat,
        baseUrl: provider.baseUrl,
        apiKey: "",
        model: provider.defaultModel,
        contextSize: provider.maxContextSize,
        temperature: (provider.temperatureRange[0] + provider.temperatureRange[1]) / 2,
        availableModels: provider.models,
        testStatus: "idle",
        testMessage: "",
      }));

      try {
        const nextAdvanced = syncToAdvancedJson(
          {
            baseUrl: provider.baseUrl,
            model: provider.defaultModel,
            contextSize: provider.maxContextSize,
            temperature: (provider.temperatureRange[0] + provider.temperatureRange[1]) / 2,
          },
          {}
        );

        setState((prev) => ({
          ...prev,
          advancedJson: nextAdvanced,
          jsonValid: true,
          jsonError: "",
        }));
      } catch {
        // 保持当前 JSON 不变，避免因同步失败导致界面异常
      }
    },
    []
  );

  const handleApiFormatChange = useCallback((format: string) => {
    setState((prev) => ({ ...prev, apiFormat: format }));
  }, []);

  const handleBaseUrlChange = useCallback((url: string) => {
    setState((prev) => ({ ...prev, baseUrl: url }));
  }, []);

  const handleApiKeyChange = useCallback((key: string) => {
    setState((prev) => ({ ...prev, apiKey: key, testStatus: "idle", testMessage: "" }));
  }, []);

  const handleModelChange = useCallback((model: string) => {
    setState((prev) => ({ ...prev, model }));
  }, []);

  const handleContextSizeChange = useCallback((size: number) => {
    setState((prev) => ({ ...prev, contextSize: size }));
  }, []);

  const handleTemperatureChange = useCallback((temp: number) => {
    setState((prev) => ({ ...prev, temperature: temp }));
  }, []);

  const handleAdvancedJsonChange = useCallback(
    (json: string) => {
      const validation = validateJsonString(json);
      setState((prev) => ({
        ...prev,
        advancedJson: json,
        jsonValid: validation.valid,
        jsonError: validation.error ?? "",
      }));

      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      if (validation.valid) {
        syncTimeoutRef.current = setTimeout(() => {
          syncFromJson(json);
        }, 500);
      }
    },
    [syncFromJson]
  );

  const handleFetchModels = useCallback(async () => {
    if (!state.providerId || !state.baseUrl || !state.apiKey) {
      handleApiError(new Error("请填写厂商、Base URL 和 API Key"), "参数不完整");
      return;
    }

    setState((prev) => ({ ...prev, modelsLoading: true }));
    try {
      const result = await fetchModelsApi({
        providerId: state.providerId,
        baseUrl: state.baseUrl,
        apiKey: state.apiKey,
      });

      if (result.success) {
        setState((prev) => ({
          ...prev,
          availableModels: result.models,
          modelsLoading: false,
        }));
        showSuccess(result.message ?? `获取到 ${result.models.length} 个模型`);
      } else {
        handleApiError(new Error(result.message ?? "获取模型列表失败"), "拉取失败");
        setState((prev) => ({ ...prev, modelsLoading: false }));
      }
    } catch (error) {
      handleApiError(error, "拉取模型失败");
      setState((prev) => ({ ...prev, modelsLoading: false }));
    }
  }, [state.providerId, state.baseUrl, state.apiKey]);

  const handleTestConnection = useCallback(async () => {
    if (!state.baseUrl || !state.apiKey || !state.model) {
      handleApiError(new Error("请填写 Base URL、API Key 和模型"), "参数不完整");
      return;
    }

    setState((prev) => ({ ...prev, testStatus: "testing", testMessage: "正在测试连接..." }));
    try {
      const result = await testConnectionApi({
        providerId: state.providerId,
        baseUrl: state.baseUrl,
        apiKey: state.apiKey,
        model: state.model,
        apiFormat: state.apiFormat,
      });

      setState((prev) => ({
        ...prev,
        testStatus: result.success ? "success" : "error",
        testMessage: result.message,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        testStatus: "error",
        testMessage: error instanceof Error ? error.message : "测试连接失败",
      }));
    }
  }, [state.providerId, state.baseUrl, state.apiKey, state.model, state.apiFormat]);

  const handleSave = useCallback(async () => {
    setState((prev) => ({ ...prev, saving: true }));
    try {
      let advancedConfig: Record<string, unknown> | undefined;

      if (state.jsonValid && state.advancedJson) {
        try {
          advancedConfig = JSON.parse(state.advancedJson) as Record<string, unknown>;
        } catch (parseError) {
          const message = parseError instanceof Error ? parseError.message : "高级配置 JSON 解析失败";
          handleApiError(new Error(message), "保存配置失败");
          setState((prev) => ({ ...prev, saving: false }));
          return;
        }
      }

      await saveAiConfigApi({
        providerId: state.providerId,
        apiKey: state.apiKey || undefined,
        baseUrl: state.baseUrl,
        model: state.model,
        contextSize: state.contextSize,
        temperature: state.temperature,
        advancedConfig,
      });

      showSuccess("配置保存成功");
    } catch (error) {
      handleApiError(error, "保存配置失败");
    } finally {
      setState((prev) => ({ ...prev, saving: false }));
    }
  }, [state]);

  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  return {
    ...state,
    handleProviderChange,
    handleApiFormatChange,
    handleBaseUrlChange,
    handleApiKeyChange,
    handleModelChange,
    handleContextSizeChange,
    handleTemperatureChange,
    handleAdvancedJsonChange,
    handleFetchModels,
    handleTestConnection,
    handleSave,
  };
}
