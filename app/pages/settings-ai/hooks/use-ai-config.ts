"use client";

import { useCallback } from "react";
import type { AiConfig } from "@/app/types";
import type { AiProvider } from "@/shared/ai/providers";
import { useProviderSelection } from "./use-provider-selection";
import { useModelDiscovery } from "./use-model-discovery";
import { useAiConfigSave } from "./use-ai-config-save";

export function useAiConfig(initialConfig?: AiConfig | null) {
  const providerState = useProviderSelection({
    initialProviderId: initialConfig?.providerId,
    initialBaseUrl: initialConfig?.baseUrl,
    initialModel: initialConfig?.model,
    initialContextSize: initialConfig?.contextSize,
    initialTemperature: initialConfig?.temperature,
    initialAdvancedJson: initialConfig?.advancedConfig
      ? JSON.stringify(initialConfig.advancedConfig, null, 2)
      : undefined,
  });

  const {
    handleProviderChange: providerHandleChange,
    ...providerFields
  } = providerState;

  const {
    handleFetchModels,
    handleTestConnection,
    ...modelFields
  } = useModelDiscovery();

  const { handleSave: rawHandleSave, ...saveFields } = useAiConfigSave();

  const handleProviderChange = useCallback(
    (providerId: string, p: AiProvider) => {
      providerHandleChange(providerId, p);
      handleFetchModels({ providerId, baseUrl: p.baseUrl, apiKey: "" });
    },
    [providerHandleChange, handleFetchModels]
  );

  const handleFetch = useCallback(() => {
    handleFetchModels({
      providerId: providerFields.providerId,
      baseUrl: providerFields.baseUrl,
      apiKey: providerFields.apiKey,
    });
  }, [
    handleFetchModels,
    providerFields.providerId,
    providerFields.baseUrl,
    providerFields.apiKey,
  ]);

  const handleTest = useCallback(() => {
    handleTestConnection({
      providerId: providerFields.providerId,
      baseUrl: providerFields.baseUrl,
      apiKey: providerFields.apiKey,
      model: providerFields.model,
      apiFormat: providerFields.apiFormat,
    });
  }, [
    handleTestConnection,
    providerFields.providerId,
    providerFields.baseUrl,
    providerFields.apiKey,
    providerFields.model,
    providerFields.apiFormat,
  ]);

  const handleSave = useCallback(() => {
    rawHandleSave({
      providerId: providerFields.providerId,
      apiKey: providerFields.apiKey,
      baseUrl: providerFields.baseUrl,
      model: providerFields.model,
      contextSize: providerFields.contextSize,
      temperature: providerFields.temperature,
      jsonValid: providerFields.jsonValid,
      advancedJson: providerFields.advancedJson,
    });
  }, [
    rawHandleSave,
    providerFields.providerId,
    providerFields.apiKey,
    providerFields.baseUrl,
    providerFields.model,
    providerFields.contextSize,
    providerFields.temperature,
    providerFields.jsonValid,
    providerFields.advancedJson,
  ]);

  return {
    ...providerFields,
    ...modelFields,
    ...saveFields,
    handleProviderChange,
    handleFetchModels: handleFetch,
    handleTestConnection: handleTest,
    handleSave,
  };
}
