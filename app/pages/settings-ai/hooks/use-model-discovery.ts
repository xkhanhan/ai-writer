"use client";

import { useState, useCallback } from "react";
import { showError, showSuccess } from "@/app/utils/error-handler";
import {
  fetchModels as fetchModelsApi,
  testConnection as testConnectionApi,
} from "../api/ai-config";

interface ModelDiscoveryState {
  availableModels: string[];
  modelsLoading: boolean;
  testStatus: "idle" | "testing" | "success" | "error";
  testMessage: string;
}

export interface UseModelDiscoveryReturn extends ModelDiscoveryState {
  handleFetchModels: (params: {
    providerId: string;
    baseUrl: string;
    apiKey: string;
  }) => Promise<void>;
  handleTestConnection: (params: {
    providerId: string;
    baseUrl: string;
    apiKey: string;
    model: string;
    apiFormat: string;
  }) => Promise<void>;
}

export function useModelDiscovery(): UseModelDiscoveryReturn {
  const [state, setState] = useState<ModelDiscoveryState>({
    availableModels: [],
    modelsLoading: false,
    testStatus: "idle",
    testMessage: "",
  });

  const handleFetchModels = useCallback(
    async (params: {
      providerId: string;
      baseUrl: string;
      apiKey: string;
    }) => {
      if (!params.providerId || !params.baseUrl || !params.apiKey) {
        showError("请填写厂商、Base URL 和 API Key");
        return;
      }

      setState((prev) => ({ ...prev, modelsLoading: true }));
      const result = await fetchModelsApi(params);

      if (result.ok && result.data.success) {
        setState((prev) => ({
          ...prev,
          availableModels: result.data.models,
          modelsLoading: false,
        }));
        showSuccess(
          result.data.message ?? `获取到 ${result.data.models.length} 个模型`
        );
      } else {
        const msg = result.ok
          ? result.data.message ?? "获取模型列表失败"
          : result.error || "拉取模型失败";
        showError(msg);
        setState((prev) => ({ ...prev, modelsLoading: false }));
      }
    },
    []
  );

  const handleTestConnection = useCallback(
    async (params: {
      providerId: string;
      baseUrl: string;
      apiKey: string;
      model: string;
      apiFormat: string;
    }) => {
      if (!params.baseUrl || !params.apiKey || !params.model) {
        showError("请填写 Base URL、API Key 和模型");
        return;
      }

      setState((prev) => ({
        ...prev,
        testStatus: "testing",
        testMessage: "正在测试连接...",
      }));
      const result = await testConnectionApi(params);

      if (result.ok) {
        const status = result.data.success ? "success" : "error";
        setState((prev) => ({
          ...prev,
          testStatus: status,
          testMessage: result.data.message,
        }));
      } else {
        const msg = result.error || "测试连接失败";
        setState((prev) => ({
          ...prev,
          testStatus: "error",
          testMessage: msg,
        }));
      }
    },
    []
  );

  return {
    ...state,
    handleFetchModels,
    handleTestConnection,
  };
}
