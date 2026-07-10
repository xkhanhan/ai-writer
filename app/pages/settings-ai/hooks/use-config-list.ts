"use client";

import { useState, useCallback } from "react";

export interface StoredConfig {
  id: string;
  name: string;
  provider: string;
  providerName: string;
  apiFormat: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  contextSize: number;
  temperature: number;
  status: "idle" | "connected" | "error";
}

interface StoredConfigRecord {
  configs: StoredConfig[];
  selectedId: string | null;
}

const STORAGE_KEY = "ai-config-list";

function generateId(): string {
  return `cfg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function loadFromStorage(): StoredConfigRecord {
  if (typeof window === "undefined") return { configs: [], selectedId: null };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { configs: [], selectedId: null };
    return JSON.parse(raw) as StoredConfigRecord;
  } catch {
    return { configs: [], selectedId: null };
  }
}

function saveToStorage(data: StoredConfigRecord): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useConfigList() {
  const [state, setState] = useState<StoredConfigRecord>(() => loadFromStorage());
  const loaded = true;

  const persist = useCallback((next: StoredConfigRecord) => {
    setState(next);
    saveToStorage(next);
  }, []);

  const selectedConfig = state.configs.find((c) => c.id === state.selectedId) ?? null;

  const selectConfig = useCallback(
    (id: string | null) => {
      persist({ ...state, selectedId: id });
    },
    [state, persist],
  );

  const addConfig = useCallback(
    (config: Omit<StoredConfig, "id" | "status">) => {
      const newConfig: StoredConfig = {
        ...config,
        id: generateId(),
        status: "idle",
      };
      const next: StoredConfigRecord = {
        configs: [...state.configs, newConfig],
        selectedId: newConfig.id,
      };
      persist(next);
      return newConfig.id;
    },
    [state, persist],
  );

  const updateConfig = useCallback(
    (id: string, updates: Partial<Omit<StoredConfig, "id">>) => {
      const next: StoredConfigRecord = {
        ...state,
        configs: state.configs.map((c) =>
          c.id === id ? { ...c, ...updates } : c,
        ),
      };
      persist(next);
    },
    [state, persist],
  );

  const deleteConfig = useCallback(
    (id: string) => {
      const remaining = state.configs.filter((c) => c.id !== id);
      const next: StoredConfigRecord = {
        configs: remaining,
        selectedId:
          state.selectedId === id
            ? remaining[0]?.id ?? null
            : state.selectedId,
      };
      persist(next);
    },
    [state, persist],
  );

  return {
    configs: state.configs,
    selectedId: state.selectedId,
    selectedConfig,
    loaded,
    selectConfig,
    addConfig,
    updateConfig,
    deleteConfig,
  };
}
