"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button, Select, Input, DatePicker, Spin, Switch, message } from "antd";
import {
  ReloadOutlined,
  DownloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import styles from "./index.module.css";

const { RangePicker } = DatePicker;

// ============ Types ============

interface UnifiedLogEntry {
  id: string;
  timestamp: string;
  level: string;
  category: string;
  message: string;
  source: "system" | "ai";
  meta?: Record<string, unknown>;
}

// ============ Constants ============

const LEVEL_OPTIONS = [
  { value: "", label: "全部级别" },
  { value: "ERROR", label: "ERROR" },
  { value: "WARN", label: "WARN" },
  { value: "INFO", label: "INFO" },
  { value: "DEBUG", label: "DEBUG" },
];

const CATEGORY_OPTIONS = [
  { value: "", label: "全部类型" },
  { value: "request", label: "请求" },
  { value: "data", label: "数据操作" },
  { value: "error", label: "异常" },
  { value: "user", label: "用户操作" },
  { value: "ai", label: "AI 操作" },
  { value: "system", label: "系统" },
];

const SOURCE_OPTIONS = [
  { value: "", label: "全部来源" },
  { value: "system", label: "系统日志" },
  { value: "ai", label: "AI 日志" },
];

const LEVEL_COLORS: Record<string, string> = {
  ERROR: "var(--color-error, #e74c3c)",
  WARN: "var(--color-warning, #f39c12)",
  INFO: "var(--color-info, #3498db)",
  DEBUG: "var(--text-light, #95a5a6)",
};

const CATEGORY_LABELS: Record<string, string> = {
  request: "请求",
  data: "数据",
  error: "异常",
  user: "用户",
  ai: "AI",
  system: "系统",
};

const REFRESH_INTERVAL_MS = 10_000;

// ============ Component ============

interface Props {
  bookId: string;
}

export function LogLibrary({ bookId }: Props) {
  const [logs, setLogs] = useState<UnifiedLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [level, setLevel] = useState("");
  const [category, setCategory] = useState("");
  const [source, setSource] = useState("");
  const [keyword, setKeyword] = useState("");
  const [timeRange, setTimeRange] = useState<[string, string] | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const limit = 50;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---- Fetch logs ----
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(page * limit),
      });
      if (level) params.set("level", level);
      if (category) params.set("category", category);
      if (source) params.set("source", source);
      if (keyword) params.set("keyword", keyword);
      if (timeRange) {
        params.set("timeFrom", timeRange[0]);
        params.set("timeTo", timeRange[1]);
      }

      const res = await fetch(`/api/logs?${params}`);
      if (res.ok) {
        const data = await res.json() as { entries: UnifiedLogEntry[]; total: number };
        setLogs(data.entries);
        setTotal(data.total);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, level, category, source, keyword, timeRange, bookId]);

  // ---- Initial load + filter change ----
  useEffect(() => {
    setPage(0);
  }, [level, category, source, keyword, timeRange]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // ---- Auto-refresh ----
  useEffect(() => {
    if (autoRefresh) {
      timerRef.current = setInterval(() => {
        void fetchLogs();
      }, REFRESH_INTERVAL_MS);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoRefresh, fetchLogs]);

  // ---- Export ----
  const handleExport = useCallback(async (format: "json" | "csv") => {
    const params = new URLSearchParams({ export: format });
    if (level) params.set("level", level);
    if (category) params.set("category", category);
    if (source) params.set("source", source);
    if (keyword) params.set("keyword", keyword);
    if (timeRange) {
      params.set("timeFrom", timeRange[0]);
      params.set("timeTo", timeRange[1]);
    }

    try {
      const res = await fetch(`/api/logs?${params}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `logs-${new Date().toISOString().slice(0, 10)}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        message.success(`已导出 ${format.toUpperCase()} 文件`);
      }
    } catch {
      message.error("导出失败");
    }
  }, [level, category, source, keyword, timeRange]);

  // ---- Time range change ----
  const handleTimeRangeChange = useCallback((_dates: unknown, dateStrings: [string, string]) => {
    if (dateStrings[0] && dateStrings[1]) {
      setTimeRange([dateStrings[0], dateStrings[1]]);
    } else {
      setTimeRange(null);
    }
  }, []);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className={styles.container}>
      {/* ─── Filter Bar ─── */}
      <div className={styles.filterBar}>
        <div className={styles.filterRow}>
          <Select
            size="small"
            value={level}
            onChange={setLevel}
            options={LEVEL_OPTIONS}
            className={styles.filterSelect}
          />
          <Select
            size="small"
            value={category}
            onChange={setCategory}
            options={CATEGORY_OPTIONS}
            className={styles.filterSelect}
          />
          <Select
            size="small"
            value={source}
            onChange={setSource}
            options={SOURCE_OPTIONS}
            className={styles.filterSelect}
          />
          <Input
            size="small"
            placeholder="搜索关键词"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={() => fetchLogs()}
            prefix={<SearchOutlined />}
            className={styles.filterInput}
          />
        </div>
        <div className={styles.filterRow}>
          <RangePicker
            size="small"
            showTime
            onChange={handleTimeRangeChange}
            className={styles.filterDatePicker}
            placeholder={["开始时间", "结束时间"]}
          />
          <div className={styles.filterActions}>
            <div className={styles.autoRefresh}>
              <Switch
                size="small"
                checked={autoRefresh}
                onChange={setAutoRefresh}
              />
              <span className={styles.autoRefreshLabel}>自动刷新</span>
            </div>
            <Button
              icon={<ReloadOutlined />}
              size="small"
              onClick={() => fetchLogs()}
              loading={loading}
            />
            <Button
              icon={<DownloadOutlined />}
              size="small"
              onClick={() => handleExport("csv")}
            >
              CSV
            </Button>
            <Button
              icon={<DownloadOutlined />}
              size="small"
              onClick={() => handleExport("json")}
            >
              JSON
            </Button>
          </div>
        </div>
      </div>

      {/* ─── Stats ─── */}
      <div className={styles.stats}>
        共 {total} 条日志
        {autoRefresh && <span className={styles.liveTag}>LIVE</span>}
      </div>

      {/* ─── Log List ─── */}
      {loading && logs.length === 0 ? (
        <div className={styles.center}>
          <Spin />
        </div>
      ) : logs.length === 0 ? (
        <div className={styles.center}>
          <div className={styles.emptyIcon}>
            <SearchOutlined />
          </div>
          <div className={styles.emptyText}>暂无日志</div>
        </div>
      ) : (
        <div className={styles.list}>
          {logs.map((entry) => (
            <LogRow
              key={entry.id}
              entry={entry}
              expanded={expandedId === entry.id}
              onToggle={() =>
                setExpandedId(expandedId === entry.id ? null : entry.id)
              }
            />
          ))}
        </div>
      )}

      {/* ─── Pagination ─── */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <Button
            size="small"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            上一页
          </Button>
          <span className={styles.pageInfo}>
            {page + 1} / {totalPages}
          </span>
          <Button
            size="small"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(page + 1)}
          >
            下一页
          </Button>
        </div>
      )}
    </div>
  );
}

// ============ Log Row ============

function LogRow({
  entry,
  expanded,
  onToggle,
}: {
  entry: UnifiedLogEntry;
  expanded: boolean;
  onToggle: () => void;
}) {
  const levelColor = LEVEL_COLORS[entry.level] || "var(--text-light)";
  const categoryLabel = CATEGORY_LABELS[entry.category] || entry.category;
  const time = new Date(
    entry.timestamp.endsWith("Z")
      ? entry.timestamp
      : entry.timestamp + "Z",
  ).toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div
      className={`${styles.logItem} ${expanded ? styles.logItemExpanded : ""} ${
        entry.level === "ERROR" ? styles.logItemError : ""
      }`}
    >
      <button className={styles.logHeader} onClick={onToggle}>
        <span className={styles.logLevel} style={{ color: levelColor }}>
          {entry.level}
        </span>
        <span className={styles.logSource}>
          {entry.source === "ai" ? "AI" : "SYS"}
        </span>
        <span className={styles.logCategory}>{categoryLabel}</span>
        <span className={styles.logMessage}>{entry.message}</span>
        <span className={styles.logTime}>{time}</span>
        <span
          className={`${styles.logArrow} ${
            expanded ? styles.logArrowOpen : ""
          }`}
        >
          ▾
        </span>
      </button>
      {expanded && entry.meta && (
        <div className={styles.logBody}>
          <pre className={styles.logMeta}>
            {JSON.stringify(entry.meta, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
