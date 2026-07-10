"use client";

import type { ArchivedChapter } from "@/app/types";
import styles from "./dashboard-charts.module.css";

export function BarChart({ data }: { data: { label: string; words: number }[] }) {
  const max = Math.max(...data.map((d) => d.words), 1);
  return (
    <div className={styles.barChart}>
      {data.map((d) => (
        <div key={d.label} className={styles.barCol}>
          <div className={styles.barValue}>{d.words > 0 ? (d.words >= 1000 ? `${(d.words / 1000).toFixed(1)}k` : String(d.words)) : "—"}</div>
          <div className={styles.bar} style={{ height: `${Math.max((d.words / max) * 100, 2)}%` }} />
          <div className={styles.barLabel}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

export function WordDistribution({ archives }: { archives: ArchivedChapter[] }) {
  const buckets = [
    { label: "2k 以下", min: 0, max: 2000 },
    { label: "2k — 3k", min: 2000, max: 3000 },
    { label: "3k — 4k", min: 3000, max: 4000 },
    { label: "4k — 5k", min: 4000, max: 5000 },
    { label: "5k 以上", min: 5000, max: Infinity },
  ];
  const counts = buckets.map((b) => archives.filter((a) => a.wordCount >= b.min && a.wordCount < b.max).length);
  const maxCount = Math.max(...counts, 1);

  return (
    <div>
      {buckets.map((b, i) => (
        <div key={b.label} className={styles.distRow}>
          <div className={styles.distLabel}>{b.label}</div>
          <div className={styles.distTrack}>
            <div className={styles.distFill} style={{ width: `${(counts[i] / maxCount) * 100}%` }} />
          </div>
          <div className={styles.distCount}>{counts[i]}</div>
        </div>
      ))}
    </div>
  );
}

export function Heatmap({ dailyWords, streak }: { dailyWords: Record<string, number>; streak: number }) {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 364);
  const dow = startDate.getDay();
  const offset = dow === 0 ? 6 : dow - 1;
  startDate.setDate(startDate.getDate() - offset);

  const weeks: string[][] = [];
  const monthLabels: { week: number; label: string }[] = [];
  let lastMonth = -1;
  const monthNames = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];

  for (let w = 0; w < 53; w++) {
    const week: string[] = [];
    for (let d = 0; d < 7; d++) {
      const cellDate = new Date(startDate);
      cellDate.setDate(cellDate.getDate() + w * 7 + d);
      if (cellDate <= today) {
        const key = cellDate.toISOString().slice(0, 10);
        week.push(key);
        if (d === 0) {
          const m = cellDate.getMonth();
          if (m !== lastMonth) {
            monthLabels.push({ week: w, label: monthNames[m] });
            lastMonth = m;
          }
        }
      } else {
        week.push("");
      }
    }
    weeks.push(week);
  }

  const maxWords = Math.max(...Object.values(dailyWords), 1);

  function getLevel(key: string) {
    if (!key || !dailyWords[key]) return "";
    const w = dailyWords[key];
    if (w < maxWords * 0.15) return styles.heat1;
    if (w < maxWords * 0.4) return styles.heat2;
    if (w < maxWords * 0.7) return styles.heat3;
    return styles.heat4;
  }

  const totalDays = Object.keys(dailyWords).filter((k) => dailyWords[k] > 0).length;

  return (
    <div>
      <div className={styles.ghHeader}>
        <div className={styles.ghStats}>
          <div className={styles.ghStat}><div className={styles.ghStatNum}>{totalDays}</div><div className={styles.ghStatLabel}>写作天数</div></div>
          <div className={styles.ghStat}><div className={styles.ghStatNum}>{streak}</div><div className={styles.ghStatLabel}>连续天数</div></div>
        </div>
      </div>
      <div className={styles.ghBody}>
        <div className={styles.ghYLabels}>
          <span></span><span>一</span><span></span><span>三</span><span></span><span>五</span><span></span>
        </div>
        <div className={styles.ghMain}>
          <div className={styles.ghMonths}>
            {monthLabels.map((m, i) => {
              const nextW = i < monthLabels.length - 1 ? monthLabels[i + 1].week : 53;
              return (
                <span key={i} className={styles.ghMonth} style={{ width: (nextW - m.week) * 16 }}>
                  {m.label}
                </span>
              );
            })}
          </div>
          <div className={styles.ghGrid}>
            {weeks.map((week, wi) => (
              <div key={wi} className={styles.ghWeek}>
                {week.map((key, di) => (
                  <div
                    key={di}
                    className={`${styles.ghCell} ${getLevel(key)}`}
                    title={key ? `${key}：${(dailyWords[key] || 0).toLocaleString()} 字` : ""}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className={styles.ghLegend}>
        <span>少</span>
        <div className={styles.ghLegendCell} style={{ background: "var(--border-light)" }} />
        <div className={styles.ghLegendCell} style={{ background: "rgba(47,93,80,0.15)" }} />
        <div className={styles.ghLegendCell} style={{ background: "rgba(47,93,80,0.35)" }} />
        <div className={styles.ghLegendCell} style={{ background: "rgba(47,93,80,0.6)" }} />
        <div className={styles.ghLegendCell} style={{ background: "var(--accent)" }} />
        <span>多</span>
      </div>
    </div>
  );
}
