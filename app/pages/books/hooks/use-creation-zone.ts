"use client";

import { useCreationData } from "./use-creation-data";
import { useCreationActions } from "./use-creation-actions";

export type { ViewMode } from "./use-creation-data";
export type { ChapterData } from "./use-creation-actions";

export function useCreationZone(bookId: string) {
  const data = useCreationData(bookId);
  const actions = useCreationActions(bookId, data);

  return {
    outline: data.outline,
    volumes: data.volumes,
    chaptersMap: data.chaptersMap,
    expandedVolumes: data.expandedVolumes,
    view: data.view,
    loading: data.loading,
    setView: data.setView,
    toggleVolume: data.toggleVolume,
    ...actions,
    reload: data.reload,
  };
}

export type CreationZoneState = ReturnType<typeof useCreationZone>;
