"use client";

import { useState, useCallback, useEffect } from "react";
import type { BookOutline, VolumeOutline, ChapterOutline, KeyPoint } from "@/app/types";
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
    try {
      const [out, vols] = await Promise.all([
        api.fetchOutline(bookId),
        api.fetchVolumes(bookId)
      ]);
      setOutline(out);
      setVolumes(vols);
      const chMap: Record<string, ChapterOutline[]> = {};
      await Promise.all(
        vols.map(async (v) => {
          chMap[v.id] = await api.fetchChapters(v.id);
        })
      );
      setChaptersMap(chMap);
    } finally {
      setLoading(false);
    }
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
      const updated = await api.updateOutline(bookId, data);
      setOutline(updated);
      return updated;
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
        const updated = await api.updateVolume(data.id, {
          title: data.title,
          coreConflict: data.coreConflict,
          stages: data.stages,
          developmentArc: data.developmentArc,
          keyPoints: data.keyPoints,
          highlights: data.highlights
        });
        setVolumes((prev) => prev.map((v) => (v.id === data.id ? updated : v)));
        return updated;
      }
      const created = await api.createVolume(bookId, {
        title: data.title,
        coreConflict: data.coreConflict,
        stages: data.stages,
        developmentArc: data.developmentArc,
        keyPoints: data.keyPoints,
        highlights: data.highlights
      });
      setVolumes((prev) => [...prev, created]);
      setChaptersMap((prev) => ({ ...prev, [created.id]: [] }));
      setExpandedVolumes((prev) => new Set(prev).add(created.id));
      return created;
    },
    [bookId]
  );

  const removeVolume = useCallback(async (volumeId: string) => {
    await api.deleteVolume(volumeId);
    setVolumes((prev) => prev.filter((v) => v.id !== volumeId));
    setChaptersMap((prev) => {
      const next = { ...prev };
      delete next[volumeId];
      return next;
    });
  }, []);

  // 章纲操作
  const refreshChapters = useCallback(async (volumeId: string) => {
    const chapters = await api.fetchChapters(volumeId);
    setChaptersMap((prev) => ({ ...prev, [volumeId]: chapters }));
    return chapters;
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
        const updated = await api.updateChapter(data.id, {
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
        setChaptersMap((prev) => ({
          ...prev,
          [volumeId]: (prev[volumeId] || []).map((c) => (c.id === data.id ? updated : c))
        }));
        return updated;
      }
      const created = await api.createChapter(volumeId, {
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
      setChaptersMap((prev) => ({
        ...prev,
        [volumeId]: [...(prev[volumeId] || []), created]
      }));
      return created;
    },
    []
  );

  const removeChapter = useCallback(async (volumeId: string, chapterId: string) => {
    await api.deleteChapter(chapterId);
    setChaptersMap((prev) => ({
      ...prev,
      [volumeId]: (prev[volumeId] || []).filter((c) => c.id !== chapterId)
    }));
  }, []);

  // 正文操作
  const saveChapterContent = useCallback(
    async (chapterId: string, content: string, status?: string) => {
      const updated = await api.updateChapter(chapterId, { content, status });
      const volId = updated.volumeId;
      setChaptersMap((prev) => ({
        ...prev,
        [volId]: (prev[volId] || []).map((c) => (c.id === chapterId ? updated : c))
      }));
      return updated;
    },
    []
  );

  const saveToArchive = useCallback(
    async (chapterId: string, sortOrder: number, title: string, content: string) => {
      await api.saveArchive(bookId, { chapterId, sortOrder, title, content });
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
