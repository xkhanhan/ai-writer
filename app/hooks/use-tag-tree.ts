"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchTagTree } from "@/app/api-client/tags";
import type { TagCategory } from "@/app/types";

/** 全局缓存：同一 bookId 只请求一次 */
const tagTreeCache = new Map<string, TagCategory[]>();

/**
 * 标签树全局缓存 Hook
 * 同一 bookId 的标签树数据在多个组件间共享，避免重复请求。
 */
export function useTagTree(bookId: string) {
  const cached = tagTreeCache.get(bookId);
  const [tags, setTags] = useState<TagCategory[]>(cached ?? []);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    if (tagTreeCache.has(bookId)) {
      return;
    }

    let cancelled = false;

    fetchTagTree(bookId).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        tagTreeCache.set(bookId, result.data);
        setTags(result.data);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [bookId]);

  /** 强制刷新（CRUD 操作后调用） */
  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await fetchTagTree(bookId);
    if (result.ok) {
      tagTreeCache.set(bookId, result.data);
      setTags(result.data);
    }
    setLoading(false);
  }, [bookId]);

  return { tags, loading, refresh };
}
