"use client";

import { useState, useCallback, useEffect } from "react";
import type { BookOutline, VolumeOutline, ChapterOutline, KeyPoint } from "@/app/types";
import { showError } from "@/app/utils/error-handler";
import * as api from "../api/creation";

export type ViewMode =
  | { type: "empty" }
  | { type: "outline" }
  | { type: "volume-form"; volumeId?: string }
  | { type: "chapter-form"; volumeId: string; chapterId?: string }
  | { type: "content-editor"; volumeId: string; chapterId: string };

export function useCreationZone(bookId: string) {
  const [outline, setOutline] = useState<BookOutline | null>(null);
  const [volumes, setVolumes] = useState<VolumeOutline[]>([]);
  const [chaptersMap, setChaptersMap] = useState<Record<string, ChapterOutline[]>>({});
  const [expandedVolumes, setExpandedVolumes] = useState<Set<string>>(new Set());
  const [view, setView] = useState<ViewMode>({ type: "empty" });
  const [loading, setLoading] = useState(true);

  // 初始加载
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

  // 展开折叠卷
  const toggleVolume = useCallback((volumeId: string) => {
    setExpandedVolumes((prev) => {
      const next = new Set(prev);
      if (next.has(volumeId)) next.delete(volumeId);
      else next.add(volumeId);
      return next;
    });
  }, []);

  // 总纲操作
  const saveOutline = useCallback(
    async (data: { direction: string; stages: string; sellingPoints: string }) => {
      const result = await api.updateOutline(bookId, data);
      if (result.ok) {
        setOutline(result.data);
        return result.data;
      }
      showError(result.error || "保存总纲失败");
      return null;
    },
    [bookId]
  );

  // 卷纲操作
  const saveVolume = useCallback(
    async (data: {
      id?: string;
      title: string;
      coreConflict?: string;
      stages?: string[];
      developmentArc?: string;
      keyPoints?: KeyPoint[];
      highlights?: string;
    }) => {
      if (data.id) {
        const result = await api.updateVolume(data.id, {
          title: data.title,
          coreConflict: data.coreConflict,
          stages: data.stages,
          developmentArc: data.developmentArc,
          keyPoints: data.keyPoints,
          highlights: data.highlights
        });
        if (!result.ok) {
          showError(result.error || "保存卷纲失败");
          return null;
        }
        setVolumes((prev) => prev.map((v) => (v.id === data.id ? result.data : v)));
        return result.data;
      }
      const result = await api.createVolume(bookId, {
        title: data.title,
        coreConflict: data.coreConflict,
        stages: data.stages,
        developmentArc: data.developmentArc,
        keyPoints: data.keyPoints,
        highlights: data.highlights
      });
      if (!result.ok) {
        showError(result.error || "创建卷纲失败");
        return null;
      }
      setVolumes((prev) => [...prev, result.data]);
      setChaptersMap((prev) => ({ ...prev, [result.data.id]: [] }));
      setExpandedVolumes((prev) => new Set(prev).add(result.data.id));
      return result.data;
    },
    [bookId]
  );

  const removeVolume = useCallback(async (volumeId: string) => {
    const result = await api.deleteVolume(volumeId);
    if (!result.ok) {
      showError(result.error || "删除卷纲失败");
      return false;
    }
    setVolumes((prev) => prev.filter((v) => v.id !== volumeId));
    setChaptersMap((prev) => {
      const next = { ...prev };
      delete next[volumeId];
      return next;
    });
    return true;
  }, []);

  // 章纲操作
  const refreshChapters = useCallback(async (volumeId: string) => {
    const result = await api.fetchChapters(volumeId);
    if (result.ok) {
      setChaptersMap((prev) => ({ ...prev, [volumeId]: result.data }));
      return result.data;
    }
    return [];
  }, []);

  const saveChapter = useCallback(
    async (
      volumeId: string,
      data: {
        id?: string;
        title: string;
        summary?: string;
        prevChapterLink?: string;
        nextChapterSuspense?: string;
        scenes?: string[];
        time?: string;
        moodTone?: string;
        characters?: string[];
        keyEvents?: string[];
        foreshadowings?: string[];
        highlights?: string;
        expectedWords?: number;
        note?: string;
      }
    ) => {
      if (data.id) {
        const result = await api.updateChapter(data.id, {
          title: data.title,
          summary: data.summary,
          prevChapterLink: data.prevChapterLink,
          nextChapterSuspense: data.nextChapterSuspense,
          scenes: data.scenes,
          time: data.time,
          moodTone: data.moodTone,
          characters: data.characters,
          keyEvents: data.keyEvents,
          foreshadowings: data.foreshadowings,
          highlights: data.highlights,
          expectedWords: data.expectedWords,
          note: data.note
        });
        if (!result.ok) {
          showError(result.error || "保存章纲失败");
          return null;
        }
        setChaptersMap((prev) => ({
          ...prev,
          [volumeId]: (prev[volumeId] || []).map((c) => (c.id === data.id ? result.data : c))
        }));
        return result.data;
      }
      const result = await api.createChapter(volumeId, {
        title: data.title,
        summary: data.summary,
        prevChapterLink: data.prevChapterLink,
        nextChapterSuspense: data.nextChapterSuspense,
        scenes: data.scenes,
        time: data.time,
        moodTone: data.moodTone,
        characters: data.characters,
        keyEvents: data.keyEvents,
        foreshadowings: data.foreshadowings,
        highlights: data.highlights,
        expectedWords: data.expectedWords,
        note: data.note
      });
      if (!result.ok) {
        showError(result.error || "创建章纲失败");
        return null;
      }
      setChaptersMap((prev) => ({
        ...prev,
        [volumeId]: [...(prev[volumeId] || []), result.data]
      }));
      return result.data;
    },
    []
  );

  const removeChapter = useCallback(async (volumeId: string, chapterId: string) => {
    const result = await api.deleteChapter(chapterId);
    if (!result.ok) {
      showError(result.error || "删除章纲失败");
      return false;
    }
    setChaptersMap((prev) => ({
      ...prev,
      [volumeId]: (prev[volumeId] || []).filter((c) => c.id !== chapterId)
    }));
    return true;
  }, []);

  // 正文操作
  const saveChapterContent = useCallback(
    async (chapterId: string, content: string, status?: string) => {
      const result = await api.updateChapter(chapterId, { content, status });
      if (!result.ok) {
        showError(result.error || "保存正文失败");
        return null;
      }
      const volId = result.data.volumeId;
      setChaptersMap((prev) => ({
        ...prev,
        [volId]: (prev[volId] || []).map((c) => (c.id === chapterId ? result.data : c))
      }));
      return result.data;
    },
    []
  );

  const saveToArchive = useCallback(
    async (chapterId: string, sortOrder: number, title: string, content: string) => {
      const result = await api.saveArchive(bookId, { chapterId, sortOrder, title, content });
      if (!result.ok) {
        showError(result.error || "保存到正文库失败");
        return false;
      }
      return true;
    },
    [bookId]
  );

  return {
    outline,
    volumes,
    chaptersMap,
    expandedVolumes,
    view,
    loading,
    setView,
    toggleVolume,
    saveOutline,
    saveVolume,
    removeVolume,
    refreshChapters,
    saveChapter,
    removeChapter,
    saveChapterContent,
    saveToArchive,
    reload: loadAll
  };
}

export type CreationZoneState = ReturnType<typeof useCreationZone>;
