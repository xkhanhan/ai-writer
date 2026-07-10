"use client";

import { useCallback } from "react";
import type {
  KeyPoint,
  CreateChapterDTO,
  UpdateChapterDTO,
} from "@/app/types";
import { showError } from "@/app/utils/error-handler";
import * as api from "../api/creation";
import type { CreationDataState } from "./use-creation-data";

interface ChapterData {
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

const CHAPTER_FIELDS: (keyof ChapterData)[] = [
  "title",
  "summary",
  "prevChapterLink",
  "nextChapterSuspense",
  "scenes",
  "time",
  "moodTone",
  "characters",
  "keyEvents",
  "foreshadowings",
  "highlights",
  "expectedWords",
  "note",
];

function buildChapterPayload(
  data: ChapterData
): Omit<CreateChapterDTO, "volumeId"> {
  const payload: Record<string, unknown> = {};
  for (const field of CHAPTER_FIELDS) {
    payload[field] = data[field];
  }
  return payload as Omit<CreateChapterDTO, "volumeId">;
}

/** 操作层：所有 CRUD 操作 */
export function useCreationActions(
  bookId: string,
  state: CreationDataState
) {
  const {
    setOutline,
    setVolumes,
    setChaptersMap,
    setExpandedVolumes,
  } = state;

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
    [bookId, setOutline]
  );

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
      const result = await api.createVolume({
        bookId,
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
    [bookId, setVolumes, setChaptersMap, setExpandedVolumes]
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
  }, [setVolumes, setChaptersMap]);

  const refreshChapters = useCallback(async (volumeId: string) => {
    const result = await api.fetchChapters(volumeId);
    if (result.ok) {
      setChaptersMap((prev) => ({ ...prev, [volumeId]: result.data }));
      return result.data;
    }
    return [];
  }, [setChaptersMap]);

  const saveChapter = useCallback(
    async (volumeId: string, data: ChapterData) => {
      const payload = buildChapterPayload(data);

      if (data.id) {
        const result = await api.updateChapter(data.id, payload as UpdateChapterDTO);
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

      const result = await api.createChapter({
        volumeId,
        ...payload,
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
    [setChaptersMap]
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
  }, [setChaptersMap]);

  const saveChapterContent = useCallback(
    async (chapterId: string, content: string, status?: "planned" | "writing" | "done") => {
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
    [setChaptersMap]
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
    saveOutline,
    saveVolume,
    removeVolume,
    refreshChapters,
    saveChapter,
    removeChapter,
    saveChapterContent,
    saveToArchive,
  };
}

export type { ChapterData };
