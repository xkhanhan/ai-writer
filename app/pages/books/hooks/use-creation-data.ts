"use client";

import { useState, useCallback, useEffect } from "react";
import type { BookOutline, VolumeOutline, ChapterOutline } from "@/app/types";
import * as api from "../api/creation";

export type ViewMode =
  | { type: "empty" }
  | { type: "outline" }
  | { type: "volume-form"; volumeId?: string }
  | { type: "chapter-form"; volumeId: string; chapterId?: string }
  | { type: "content-editor"; volumeId: string; chapterId: string };

export interface CreationDataState {
  outline: BookOutline | null;
  volumes: VolumeOutline[];
  chaptersMap: Record<string, ChapterOutline[]>;
  expandedVolumes: Set<string>;
  view: ViewMode;
  loading: boolean;
  setView: React.Dispatch<React.SetStateAction<ViewMode>>;
  setOutline: React.Dispatch<React.SetStateAction<BookOutline | null>>;
  setVolumes: React.Dispatch<React.SetStateAction<VolumeOutline[]>>;
  setChaptersMap: React.Dispatch<React.SetStateAction<Record<string, ChapterOutline[]>>>;
  setExpandedVolumes: React.Dispatch<React.SetStateAction<Set<string>>>;
  toggleVolume: (volumeId: string) => void;
}

/** 数据层：查询/加载，管理所有读取状态 */
export function useCreationData(bookId: string): CreationDataState & { reload: () => Promise<void> } {
  const [outline, setOutline] = useState<BookOutline | null>(null);
  const [volumes, setVolumes] = useState<VolumeOutline[]>([]);
  const [chaptersMap, setChaptersMap] = useState<Record<string, ChapterOutline[]>>({});
  const [expandedVolumes, setExpandedVolumes] = useState<Set<string>>(new Set());
  const [view, setView] = useState<ViewMode>({ type: "empty" });
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [outResult, volsResult] = await Promise.all([
      api.fetchOutline(bookId),
      api.fetchVolumes(bookId)
    ]);

    if (outResult.ok) setOutline(outResult.data);
    if (volsResult.ok) {
      setVolumes(volsResult.data);
      const chMap: Record<string, ChapterOutline[]> = {};
      const chResults = await Promise.all(
        volsResult.data.map(async (v) => ({
          volId: v.id,
          result: await api.fetchChapters(v.id)
        }))
      );
      for (const { volId, result } of chResults) {
        if (result.ok) chMap[volId] = result.data;
      }
      setChaptersMap(chMap);
    }

    setLoading(false);
  }, [bookId]);

  useEffect(() => {
    void (async () => {
      await loadAll();
    })();
  }, [loadAll]);

  const toggleVolume = useCallback((volumeId: string) => {
    setExpandedVolumes((prev) => {
      const next = new Set(prev);
      if (next.has(volumeId)) next.delete(volumeId);
      else next.add(volumeId);
      return next;
    });
  }, []);

  return {
    outline,
    volumes,
    chaptersMap,
    expandedVolumes,
    view,
    loading,
    setView,
    setOutline,
    setVolumes,
    setChaptersMap,
    setExpandedVolumes,
    toggleVolume,
    reload: loadAll,
  };
}
