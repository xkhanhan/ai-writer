"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { AiProvider } from "@/shared/ai/providers";
import { getProviderById, getDefaultProvider } from "@/shared/ai/providers";
import { validateJsonString } from "../utils/json-security";
import { syncToAdvancedJson, syncFromAdvancedJson } from "../utils/json-sync";

interface ProviderState {
  providerId: string;
  provider: AiProvider;
  apiFormat: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  contextSize: number;
  temperature: number;
  advancedJson: string;
  jsonValid: boolean;
  jsonError: string;
}

export interface UseProviderSelectionReturn extends ProviderState {
  handleProviderChange: (providerId: string, provider: AiProvider) => void;
  handleApiFormatChange: (format: string) => void;
  handleBaseUrlChange: (url: string) => void;
  handleApiKeyChange: (key: string) => void;
  handleModelChange: (model: string) => void;
  handleContextSizeChange: (size: number) => void;
  handleTemperatureChange: (temp: number) => void;
  handleAdvancedJsonChange: (json: string) => void;
}

interface UseProviderSelectionOptions {
  initialProviderId?: string;
  initialBaseUrl?: string;
  initialModel?: string;
  initialContextSize?: number;
  initialTemperature?: number;
  initialAdvancedJson?: string;
}

export function useProviderSelection(
  options: UseProviderSelectionOptions = {}
): UseProviderSelectionReturn {
  const defaultProvider = getDefaultProvider();

  const [state, setState] = useState<ProviderState>({
    providerId: options.initialProviderId ?? defaultProvider.id,
    provider:
      getProviderById(options.initialProviderId ?? defaultProvider.id) ??
      defaultProvider,
    apiFormat: "openai",
    baseUrl: options.initialBaseUrl ?? defaultProvider.baseUrl,
    apiKey: "",
    model: options.initialModel ?? defaultProvider.defaultModel,
    contextSize:
      options.initialContextSize ?? defaultProvider.maxContextSize,
    temperature: options.initialTemperature ?? 0.7,
    advancedJson: options.initialAdvancedJson ?? "",
    jsonValid: true,
    jsonError: "",
  });

  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  const syncFieldsFromJson = useCallback((json: string) => {
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
      const avgTemp =
        (provider.temperatureRange[0] + provider.temperatureRange[1]) / 2;

      setState((prev) => ({
        ...prev,
        providerId,
        provider,
        apiFormat: provider.apiFormat,
        baseUrl: provider.baseUrl,
        apiKey: "",
        model: provider.defaultModel,
        contextSize: provider.maxContextSize,
        temperature: avgTemp,
        testStatus: "idle",
        testMessage: "",
      }));

      try {
        const nextAdvanced = syncToAdvancedJson(
          {
            baseUrl: provider.baseUrl,
            model: provider.defaultModel,
            contextSize: provider.maxContextSize,
            temperature: avgTemp,
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
        // keep current JSON on sync failure
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
    setState((prev) => ({
      ...prev,
      apiKey: key,
      testStatus: "idle",
      testMessage: "",
    }));
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
          syncFieldsFromJson(json);
        }, 500);
      }
    },
    [syncFieldsFromJson]
  );

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
  };
}
