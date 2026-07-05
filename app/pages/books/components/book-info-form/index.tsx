"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal, Form, Input, InputNumber, Select, Button, Spin, Descriptions, Tag, Typography, Tooltip } from "antd";
import { EditOutlined } from "@ant-design/icons";
import { client } from "@/app/api-client";
import { BOOK_GENRES, BOOK_PLATFORMS } from "@/app/constants";
import { useBook } from "@/app/pages/books/hooks/use-book";
import type { BookOptions, GenreTreeNode, UpdateBookDTO, ArchivedChapter, VolumeOutline, ChapterOutline } from "@/app/types";
import type { Book } from "@/app/types";
import styles from "./index.module.css";

/* ===================================================================
   BookInfoDashboard — 书籍信息仪表盘
   =================================================================== */

interface BookInfoDashboardProps {
  book: Book;
}

export default function BookInfoDashboard({ book: initialBook }: BookInfoDashboardProps) {
  const { book, loading, update } = useBook(initialBook);
  const [editOpen, setEditOpen] = useState(false);
  const [options, setOptions] = useState<BookOptions | null>(null);

  // 统计数据
  const [archives, setArchives] = useState<ArchivedChapter[]>([]);
  const [chapters, setChapters] = useState<ChapterOutline[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    client
      .get<{ success: boolean; options: BookOptions }>("/api/book-options")
      .then((res) => setOptions(res.success ? res.options : null))
      .catch(() => {});
  }, []);

  // 加载统计相关数据（mount 时执行一次）
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const volRes = await client.get<{ volumes: VolumeOutline[] }>(
          `/api/volumes?bookId=${book.id}`
        );
        const vols = volRes.volumes ?? [];

        const allChapters: ChapterOutline[] = [];
        for (const vol of vols) {
          try {
            const chRes = await client.get<{ chapters: ChapterOutline[] }>(
              `/api/chapters?volumeId=${vol.id}`
            );
            allChapters.push(...(chRes.chapters ?? []));
          } catch { /* skip */ }
        }

        const arcRes = await client.get<{ archives: ArchivedChapter[] }>(
          `/api/archive?bookId=${book.id}`
        );

        if (!cancelled) {
          setChapters(allChapters);
          setArchives(arcRes.archives ?? []);
          setStatsLoading(false);
        }
      } catch {
        if (!cancelled) setStatsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [book.id]);

  const tags = useMemo(
    () => (book.tags ? book.tags.split(",").map((t) => t.trim()).filter(Boolean) : []),
    [book.tags]
  );

  // 计算统计数据
  const stats = useMemo(() => {
    const totalWords = archives.reduce((sum, a) => sum + (a.wordCount || 0), 0);
    const totalChapters = chapters.length;
    const doneChapters = chapters.filter((c) => c.status === "done").length;
    const writingChapters = chapters.filter((c) => c.status === "writing").length;
    const avgWords = totalChapters > 0 ? Math.round(totalWords / doneChapters || totalWords / totalChapters) : 0;

    // 按天统计字数（用于热力图和7天趋势）
    const dailyWords: Record<string, number> = {};
    for (const a of archives) {
      if (a.archivedAt) {
        const day = a.archivedAt.slice(0, 10); // YYYY-MM-DD
        dailyWords[day] = (dailyWords[day] || 0) + a.wordCount;
      }
    }

    // 最近7天字数
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

    // 连续写作天数
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

  return (
    <div className={styles.dash}>
      {/* 标题栏 */}
      <div className={styles.dashTop}>
        <div className={styles.dashTitleWrap}>
          <h1 className={styles.dashTitle}>{book.title}</h1>
          <div className={styles.dashTags}>
            {book.genre && <span className={styles.dashTag}>{book.genre}</span>}
            {book.subGenre && <span className={styles.dashTag}>{book.subGenre}</span>}
            {book.platform && <span className={styles.dashTag}>{book.platform}</span>}
            {book.targetAudience && <span className={styles.dashTag}>{book.targetAudience}</span>}
          </div>
        </div>
        <Button
          size="small"
          icon={<EditOutlined />}
          className={styles.dashEditBtn}
          onClick={() => setEditOpen(true)}
        >
          编辑信息
        </Button>
      </div>

      {statsLoading ? (
        <div className={styles.dashLoading}><Spin /></div>
      ) : (
        <>
          {/* 统计条 */}
          <div className={styles.statBar}>
            <StatCell value={stats.totalWords.toLocaleString()} unit="字" label="已写字数" />
            <StatCell value={String(stats.totalChapters)} unit="章" label="总章节" />
            <StatCell value={stats.avgWords.toLocaleString()} unit="字" label="章均字数" />
            <StatCell value={String(stats.doneChapters)} unit="章" label="已过审" />
          </div>

          {/* 书籍信息 */}
          <div className={styles.dashCard}>
            <div className={styles.dashCardTitle}>书籍信息</div>
            <Descriptions column={{ xs: 1, sm: 2, md: 3 }} size="small" bordered>
              <Descriptions.Item label="题材">
                <InfoTruncate text={book.genre && book.subGenre ? `${book.genre} · ${book.subGenre}` : book.genre} />
              </Descriptions.Item>
              <Descriptions.Item label="平台">
                <InfoTruncate text={book.platform} />
              </Descriptions.Item>
              <Descriptions.Item label="文笔文风">
                <InfoTruncate text={book.writingStyle} />
              </Descriptions.Item>
              <Descriptions.Item label="每章字数">
                <InfoTruncate text={book.targetWordCount ? `${book.targetWordCount.toLocaleString()} 字` : undefined} />
              </Descriptions.Item>
              <Descriptions.Item label="核心卖点">
                <Typography.Text type="success" strong>
                  <InfoTruncate text={book.sellingPoint} />
                </Typography.Text>
              </Descriptions.Item>
              <Descriptions.Item label="参考作品">
                <InfoTruncate text={book.referenceWorks} />
              </Descriptions.Item>
              <Descriptions.Item label="受众">
                <InfoTruncate text={book.targetAudience} />
              </Descriptions.Item>
              <Descriptions.Item label="标签" span={tags.length > 0 ? { xs: 1, sm: 2, md: 3 } : 1}>
                {tags.length > 0 ? (
                  <div className={styles.infoTagsWrap}>
                    {tags.map((t) => (
                      <Tooltip key={t} title={t.length > 20 ? t : undefined}>
                        <Tag color="green" className={styles.infoTagItem}>{t}</Tag>
                      </Tooltip>
                    ))}
                  </div>
                ) : <span style={{ color: "var(--text-light)" }}>—</span>}
              </Descriptions.Item>
              {book.description && (
                <Descriptions.Item label="简介" span={{ xs: 1, sm: 2, md: 3 }}>
                  <Typography.Paragraph
                    ellipsis={{ rows: 2, tooltip: book.description }}
                    style={{ marginBottom: 0, fontSize: 12 }}
                  >
                    {book.description}
                  </Typography.Paragraph>
                </Descriptions.Item>
              )}
            </Descriptions>
          </div>

          {/* 7天趋势 + 写作进度 */}
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

          {/* 最近活动 */}
          <div className={styles.dashCard}>
            <div className={styles.dashCardTitle}>最近活动</div>
            <RecentActivity archives={archives} chapters={chapters} />
          </div>

          {/* 章节长度分布 */}
          <div className={styles.dashCard}>
            <div className={styles.dashCardTitle}>章节长度分布</div>
            <WordDistribution archives={archives} />
          </div>

          {/* GitHub 热力图 */}
          <div className={styles.dashCard}>
            <div className={styles.dashCardTitle}>创作热力图</div>
            <Heatmap dailyWords={stats.dailyWords} streak={stats.streak} />
          </div>
        </>
      )}

      {/* 编辑弹窗 */}
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
            // handled by hook
          }
        }}
      />
    </div>
  );
}

/* ===================================================================
   子组件
   =================================================================== */

function StatCell({ value, unit, label }: { value: string; unit: string; label: string }) {
  return (
    <div className={styles.statCell}>
      <div className={styles.statNum}>{value}<span className={styles.statUnit}>{unit}</span></div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );
}

function InfoTruncate({ text }: { text?: string }) {
  if (!text) return <span style={{ color: "var(--text-light)" }}>—</span>;
  return (
    <Tooltip title={text} placement="topLeft">
      <span className={styles.infoTruncate}>{text}</span>
    </Tooltip>
  );
}

function BarChart({ data }: { data: { label: string; words: number }[] }) {
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

function ProgressRow({ label, count, total, accent }: { label: string; count: number; total: number; accent?: boolean }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className={styles.progressRow}>
      <div className={styles.progressLabel}>{label}</div>
      <div className={styles.progressTrack}>
        <div
          className={`${styles.progressFill} ${accent ? styles.progressFillAccent : ""}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className={styles.progressCount}>{count}</div>
    </div>
  );
}

function RecentActivity({ archives, chapters }: { archives: ArchivedChapter[]; chapters: ChapterOutline[] }) {
  // 合并最近活动：已归档的章节 + 最近更新的章纲
  const items: { time: string; text: string; active: boolean }[] = [];

  for (const a of archives.slice(-5)) {
    items.push({
      time: a.archivedAt || "",
      text: `过审了 <b>${a.title}</b>`,
      active: true,
    });
  }
  for (const c of chapters.filter((ch) => ch.status === "writing").slice(-3)) {
    items.push({
      time: c.updatedAt || "",
      text: `正在写 <b>${c.title}</b>`,
      active: true,
    });
  }

  // 按时间排序取最近5条
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
            <div className={styles.tlText} dangerouslySetInnerHTML={{ __html: item.text }} />
            <div className={styles.tlTime}>{formatTime(item.time)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function WordDistribution({ archives }: { archives: ArchivedChapter[] }) {
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

function Heatmap({ dailyWords, streak }: { dailyWords: Record<string, number>; streak: number }) {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 364);
  // 对齐到周一
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
        <div className={`${styles.ghLegendCell}`} style={{ background: "var(--border-light)" }} />
        <div className={styles.ghLegendCell} style={{ background: "rgba(47,93,80,0.15)" }} />
        <div className={styles.ghLegendCell} style={{ background: "rgba(47,93,80,0.35)" }} />
        <div className={styles.ghLegendCell} style={{ background: "rgba(47,93,80,0.6)" }} />
        <div className={styles.ghLegendCell} style={{ background: "var(--accent)" }} />
        <span>多</span>
      </div>
    </div>
  );
}

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

/* ===================================================================
   BookInfoEditModal — 编辑弹窗
   =================================================================== */

interface BookInfoEditModalProps {
  open: boolean;
  book: Book;
  options: BookOptions | null;
  loading: boolean;
  onClose: () => void;
  onSave: (data: UpdateBookDTO) => Promise<void>;
}

function BookInfoEditModal({ open, book, options, loading, onClose, onSave }: BookInfoEditModalProps) {
  const [form] = Form.useForm();

  const genreTree: GenreTreeNode[] =
    options?.genreTree ??
    BOOK_GENRES.map((g) => ({ value: g, label: g }));
  const platforms = options?.platforms ?? BOOK_PLATFORMS;

  const selectedGenre = Form.useWatch("genre", form);
  const subGenreOptions =
    genreTree
      .find((g) => g.value === selectedGenre)
      ?.children?.map((c) => ({ label: c.label, value: c.value })) ?? [];

  const initialTags = book.tags
    ? book.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const tags = Array.isArray(values.tags)
        ? (values.tags as string[]).join(",")
        : (values.tags as string) ?? "";
      await onSave({
        title: values.title,
        genre: values.genre ?? "",
        subGenre: values.subGenre ?? "",
        platform: values.platform ?? "",
        targetAudience: values.targetAudience ?? "",
        tags,
        writingStyle: values.writingStyle ?? "",
        targetWordCount: values.targetWordCount ?? 0,
        referenceWorks: values.referenceWorks ?? "",
        sellingPoint: values.sellingPoint ?? "",
        description: values.description ?? "",
      });
    } catch {
      // validation error — antd handles display
    }
  };

  return (
    <Modal
      title="编辑书籍信息"
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={loading}
      width={640}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          title: book.title,
          genre: book.genre || undefined,
          subGenre: book.subGenre || undefined,
          platform: book.platform || undefined,
          targetAudience: book.targetAudience || undefined,
          tags: initialTags,
          writingStyle: book.writingStyle || undefined,
          targetWordCount: book.targetWordCount || undefined,
          referenceWorks: book.referenceWorks,
          sellingPoint: book.sellingPoint,
          description: book.description,
        }}
        requiredMark={false}
        style={{ marginTop: 16 }}
      >
        <Form.Item name="title" label="书名" rules={[{ required: true, message: "请输入书名" }]}>
          <Input placeholder="请输入书名" maxLength={60} />
        </Form.Item>

        <div className={styles.formRow}>
          <Form.Item name="genre" label="题材" rules={[{ required: true, message: "请选择题材" }]} className={styles.halfWidth}>
            <Select placeholder="选择题材" options={genreTree.map((g) => ({ label: g.label, value: g.value }))} />
          </Form.Item>
          <Form.Item name="subGenre" label="子题材" rules={[{ required: true, message: "请选择子题材" }]} className={styles.halfWidth}>
            <Select placeholder="选择子题材" options={subGenreOptions} disabled={!selectedGenre} />
          </Form.Item>
        </div>

        <div className={styles.formRow}>
          <Form.Item name="platform" label="发布平台" rules={[{ required: true, message: "请选择发布平台" }]} className={styles.halfWidth}>
            <Select placeholder="选择发布平台" options={platforms.map((p) => ({ label: p, value: p }))} />
          </Form.Item>
          <Form.Item name="targetAudience" label="目标受众" rules={[{ required: true, message: "请选择目标受众" }]} className={styles.halfWidth}>
            <Select placeholder="选择目标受众" options={(options?.targetAudiences ?? []).map((a) => ({ label: a, value: a }))} />
          </Form.Item>
        </div>

        <Form.Item name="tags" label="标签" tooltip="输入标签后按回车添加">
          <Select mode="tags" maxCount={10} placeholder="输入标签，按回车添加" />
        </Form.Item>

        <Form.Item name="writingStyle" label="文笔文风" rules={[{ required: true, message: "请选择文笔文风" }]}>
          <Select placeholder="选择文笔文风" options={(options?.writingStyles ?? []).map((s) => ({ label: s, value: s }))} />
        </Form.Item>

        <div className={styles.formRow}>
          <Form.Item name="chaptersPerBook" label="每章字数" rules={[{ required: true, message: "请输入每章字数" }]} className={styles.halfWidth}>
            <InputNumber min={500} max={10000} step={500} placeholder="如 3000" style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="targetWordCount" label="总字数（万字）" className={styles.halfWidth}>
            <InputNumber min={0} step={10} placeholder="如 200" style={{ width: "100%" }} />
          </Form.Item>
        </div>

        <Form.Item name="referenceWorks" label="参考作品">
          <Input placeholder="如：凡人修仙传、斗破苍穹" maxLength={200} />
        </Form.Item>

        <Form.Item name="sellingPoint" label="核心卖点" extra="影响 AI 生成重心">
          <Input placeholder="这本书的核心吸引力" maxLength={200} />
        </Form.Item>

        <Form.Item name="description" label="简介" rules={[{ required: true, message: "请输入简介" }]}>
          <Input.TextArea rows={4} maxLength={2000} showCount placeholder="请输入书籍简介" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
