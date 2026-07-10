import { useEffect, useMemo, useState } from "react";
import { client } from "@/app/api-client";
import type { ArchivedChapter, ChapterOutline, VolumeOutline } from "@/app/types";

interface BookStats {
  totalWords: number;
  totalChapters: number;
  doneChapters: number;
  writingChapters: number;
  avgWords: number;
  dailyWords: Record<string, number>;
  weekData: { label: string; words: number }[];
  streak: number;
}

export function useBookStats(bookId: string) {
  const [archives, setArchives] = useState<ArchivedChapter[]>([]);
  const [chapters, setChapters] = useState<ChapterOutline[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const volRes = await client.get<{ volumes: VolumeOutline[] }>(
        `/api/volumes?bookId=${bookId}`
      );
      const vols = volRes.ok ? (volRes.data.volumes ?? []) : [];

      const allChapters: ChapterOutline[] = [];
      for (const vol of vols) {
        const chRes = await client.get<{ chapters: ChapterOutline[] }>(
          `/api/chapters?volumeId=${vol.id}`
        );
        if (chRes.ok) allChapters.push(...(chRes.data.chapters ?? []));
      }

      const arcRes = await client.get<{ archives: ArchivedChapter[] }>(
        `/api/archive?bookId=${bookId}`
      );

      if (!cancelled) {
        setChapters(allChapters);
        setArchives(arcRes.ok ? (arcRes.data.archives ?? []) : []);
        setStatsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [bookId]);

  const stats = useMemo<BookStats>(() => {
    const totalWords = archives.reduce((sum, a) => sum + (a.wordCount || 0), 0);
    const totalChapters = chapters.length;
    const doneChapters = chapters.filter((c) => c.status === "done").length;
    const writingChapters = chapters.filter((c) => c.status === "writing").length;
    const avgWords = totalChapters > 0 ? Math.round(totalWords / doneChapters || totalWords / totalChapters) : 0;

    const dailyWords: Record<string, number> = {};
    for (const a of archives) {
      if (a.archivedAt) {
        const day = a.archivedAt.slice(0, 10);
        dailyWords[day] = (dailyWords[day] || 0) + a.wordCount;
      }
    }

    const today = new Date();
    const weekData: { label: string; words: number }[] = [];
    const dayNames = ["日", "一", "二", "三", "四", "五", "六"];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      weekData.push({
        label: dayNames[d.getDay()],
        words: dailyWords[key] || 0,
      });
    }

    let streak = 0;
    const d = new Date(today);
    while (true) {
      const key = d.toISOString().slice(0, 10);
      if (dailyWords[key] && dailyWords[key] > 0) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }

    return { totalWords, totalChapters, doneChapters, writingChapters, avgWords, dailyWords, weekData, streak };
  }, [chapters, archives]);

  return { stats, statsLoading, archives, chapters };
}
