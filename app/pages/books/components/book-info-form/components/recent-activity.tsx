"use client";

import type { ArchivedChapter, ChapterOutline } from "@/app/types";
import styles from "./recent-activity.module.css";

function formatTime(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "刚刚";
  if (diffMin < 60) return `${diffMin} 分钟前`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} 小时前`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD} 天前`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function RecentActivity({ archives, chapters }: { archives: ArchivedChapter[]; chapters: ChapterOutline[] }) {
  const items: { time: string; kind: "archive" | "writing"; title: string; active: boolean }[] = [];

  for (const a of archives.slice(-5)) {
    items.push({
      time: a.archivedAt || "",
      kind: "archive",
      title: a.title,
      active: true,
    });
  }
  for (const c of chapters.filter((ch) => ch.status === "writing").slice(-3)) {
    items.push({
      time: c.updatedAt || "",
      kind: "writing",
      title: c.title,
      active: true,
    });
  }

  items.sort((a, b) => (b.time > a.time ? 1 : -1));
  const recent = items.slice(0, 5);

  if (recent.length === 0) {
    return <div className={styles.emptyHint}>暂无活动记录</div>;
  }

  return (
    <div className={styles.tlList}>
      {recent.map((item, i) => (
        <div key={i} className={styles.tlItem}>
          <div className={`${styles.tlDot} ${item.active ? styles.tlDotOn : ""}`} />
          <div className={styles.tlContent}>
            <div className={styles.tlText}>
              {item.kind === "archive" ? "过审了 " : "正在写 "}<b>{item.title}</b>
            </div>
            <div className={styles.tlTime}>{formatTime(item.time)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
