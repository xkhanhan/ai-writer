"use client";

import { useState, useCallback, useEffect } from "react";
import {
  getAiConfigList,
  createAiConfigRecord,
  updateAiConfigRecord,
  deleteAiConfigRecord,
  type AiConfigRecord,
} from "../api/ai-config";

export type StoredConfig = AiConfigRecord;

export function useConfigList() {
  const [configs, setConfigs] = useState<StoredConfig[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const selectedConfig = configs.find((c) => c.id === selectedId) ?? null;

  // Load configs from backend on mount
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await getAiConfigList();
      if (!cancelled && res.ok) {
        setConfigs(res.data);
        // Auto-select first if none selected
        if (res.data.length > 0) {
          setSelectedId((prev) => prev ?? res.data[0].id);
        }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const selectConfig = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  const addConfig = useCallback(
    async (data: Omit<StoredConfig, "id" | "updatedAt" | "status">) => {
      const res = await createAiConfigRecord(data);
      if (res.ok) {
        setConfigs((prev) => [...prev, res.data]);
        setSelectedId(res.data.id);
        return res.data.id;
      }
      return null;
    },
    []
  );

  const updateConfig = useCallback(
    async (id: string, updates: Partial<Omit<StoredConfig, "id" | "updatedAt">>) => {
      const res = await updateAiConfigRecord(id, updates);
      if (res.ok) {
        setConfigs((prev) =>
          prev.map((c) => (c.id === id ? res.data : c))
        );
      }
      return res.ok;
    },
    []
  );

  const deleteConfig = useCallback(
    async (id: string) => {
      const res = await deleteAiConfigRecord(id);
      if (res.ok) {
        setConfigs((prev) => {
          const remaining = prev.filter((c) => c.id !== id);
          if (selectedId === id) {
            setSelectedId(remaining[0]?.id ?? null);
          }
          return remaining;
        });
      }
    },
    [selectedId]
  );

  return {
    configs,
    selectedId,
    selectedConfig,
    loading,
    selectConfig,
    addConfig,
    updateConfig,
    deleteConfig,
  };
}
