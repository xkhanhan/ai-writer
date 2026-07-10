"use client";

import { useEffect, useState } from "react";
import { Button, Spin } from "antd";
import { EditOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { AiSceneModal } from "@/shared/ui/ai-scene-modal";
import { getBookInfoScenes } from "../../config/ai-scenes";
import { client } from "@/app/api-client";
import { useBook } from "@/app/pages/books/hooks/use-book";
import { showError } from "@/app/utils/error-handler";
import { useBookStats } from "./hooks/use-book-stats";
import { StatCell, ProgressRow, BookInfoCard } from "./components/dashboard-stats";
import { BarChart, WordDistribution, Heatmap } from "./components/dashboard-charts";
import { RecentActivity } from "./components/recent-activity";
import { BookInfoEditModal } from "./components/book-info-edit-modal";
import type { Book, BookOptions } from "@/app/types";
import styles from "./index.module.css";

interface BookInfoDashboardProps {
  book: Book;
}

export default function BookInfoDashboard({ book: initialBook }: BookInfoDashboardProps) {
  const { book, loading, update, refreshBook } = useBook(initialBook);
  const [editOpen, setEditOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [options, setOptions] = useState<BookOptions | null>(null);
  const { stats, statsLoading, archives, chapters } = useBookStats(book.id);

  useEffect(() => {
    client
      .get<{ success: boolean; options: BookOptions }>("/api/book-options")
      .then((res) => setOptions(res.ok && res.data.success ? res.data.options : null));
  }, []);

  return (
    <div className={styles.dash}>
      <div className={styles.dashTop}>
        <h1 className={styles.dashTitle}>{book.title}</h1>
        <div className={styles.dashTopRow}>
          <div className={styles.dashTags}>
            {book.genre && <span className={styles.dashTag}>{book.genre}</span>}
            {book.subGenre && <span className={styles.dashTag}>{book.subGenre}</span>}
            {book.platform && <span className={styles.dashTag}>{book.platform}</span>}
            {book.targetAudience && <span className={styles.dashTag}>{book.targetAudience}</span>}
          </div>
          <div className={styles.dashTopActions}>
            <Button type="primary" size="small" icon={<ThunderboltOutlined />} onClick={() => setAiOpen(true)}>
              AI 填写
            </Button>
            <Button size="small" icon={<EditOutlined />} className={styles.dashEditBtn} onClick={() => setEditOpen(true)}>
              编辑信息
            </Button>
          </div>
        </div>
      </div>

      {statsLoading ? (
        <div className={styles.dashLoading}><Spin /></div>
      ) : (
        <>
          <div className={styles.statBar}>
            <StatCell value={stats.totalWords.toLocaleString()} unit="字" label="已写字数" />
            <StatCell value={String(stats.totalChapters)} unit="章" label="总章节" />
            <StatCell value={stats.avgWords.toLocaleString()} unit="字" label="章均字数" />
            <StatCell value={String(stats.doneChapters)} unit="章" label="已过审" />
          </div>

          <div className={styles.dashCard}>
            <div className={styles.dashCardTitle}>书籍信息</div>
            <BookInfoCard book={book} />
          </div>

          <div className={styles.grid2}>
            <div className={styles.dashCard}>
              <div className={styles.dashCardTitle}>近 7 天字数</div>
              <BarChart data={stats.weekData} />
            </div>
            <div className={styles.dashCard}>
              <div className={styles.dashCardTitle}>写作进度</div>
              <ProgressRow label="计划中" count={stats.totalChapters - stats.doneChapters - stats.writingChapters} total={stats.totalChapters} />
              <ProgressRow label="写作中" count={stats.writingChapters} total={stats.totalChapters} />
              <ProgressRow label="已过审" count={stats.doneChapters} total={stats.totalChapters} accent />
            </div>
          </div>

          <div className={styles.dashCard}>
            <div className={styles.dashCardTitle}>最近活动</div>
            <RecentActivity archives={archives} chapters={chapters} />
          </div>

          <div className={styles.dashCard}>
            <div className={styles.dashCardTitle}>章节长度分布</div>
            <WordDistribution archives={archives} />
          </div>

          <div className={styles.dashCard}>
            <div className={styles.dashCardTitle}>创作热力图</div>
            <Heatmap dailyWords={stats.dailyWords} streak={stats.streak} />
          </div>
        </>
      )}

      <BookInfoEditModal
        open={editOpen}
        book={book}
        options={options}
        loading={loading}
        onClose={() => setEditOpen(false)}
        onSave={async (data) => {
          try {
            await update(data);
            setEditOpen(false);
          } catch {
            showError("保存失败");
          }
        }}
      />

      <AiSceneModal
        open={aiOpen}
        scene={getBookInfoScenes(book, async () => {})}
        bookId={book.id}
        onClose={() => setAiOpen(false)}
        onSaved={async () => {
          setAiOpen(false);
          await refreshBook();
        }}
        onSave={getBookInfoScenes(book, async () => {}).onSave}
      />
    </div>
  );
}
