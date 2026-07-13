"use client";

import { useState, useEffect, useCallback } from "react";
import { Drawer, Spin, Button, Input, Select } from "antd";
import { ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import styles from "./index.module.css";

// ============ Types ============

interface LogEntry {
  timestamp: string;
  level: string;
  category: string;
  message: string;
  meta?: Record<string, unknown>;
}

interface Props {
  open: boolean;
  onClose: () => void;
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

const LEVEL_COLORS: Record<string, string> = {
  ERROR: "#e74c3c",
  WARN: "#f39c12",
  INFO: "#3498db",
  DEBUG: "#95a5a6",
};

const CATEGORY_LABELS: Record<string, string> = {
  request: "请求",
  data: "数据",
  error: "异常",
  user: "用户",
  ai: "AI",
  system: "系统",
};

// ============ Component ============

export function SystemLogDrawer({ open, onClose }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [level, setLevel] = useState("");
  const [category, setCategory] = useState("");
  const [keyword, setKeyword] = useState("");
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const limit = 50;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(page * limit),
      });
      if (level) params.set("level", level);
      if (category) params.set("category", category);
      if (keyword) params.set("keyword", keyword);

      const res = await fetch(`/api/logs?${params}`);
      if (res.ok) {
        const data = await res.json() as { entries: LogEntry[]; total: number };
        setLogs(data.entries);
        setTotal(data.total);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, level, category, keyword]);

  useEffect(() => {
    if (open) {
      setPage(0);
      fetchLogs();
    }
  }, [open, fetchLogs]);

  const totalPages = Math.ceil(total / limit);

  return (
    <Drawer
      title="系统日志"
      open={open}
      onClose={onClose}
      width={720}
      destroyOnClose
    >
      {/* Filters */}
      <div className={styles.filters}>
        <Select
          size="small"
          value={level}
          onChange={(v) => { setLevel(v); setPage(0); }}
          options={LEVEL_OPTIONS}
          style={{ width: 110 }}
        />
        <Select
          size="small"
          value={category}
          onChange={(v) => { setCategory(v); setPage(0); }}
          options={CATEGORY_OPTIONS}
          style={{ width: 110 }}
        />
        <Input.Search
          size="small"
          placeholder="搜索关键词"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onSearch={() => { setPage(0); fetchLogs(); }}
          style={{ width: 180 }}
        />
        <Button icon={<ReloadOutlined />} size="small" onClick={fetchLogs} loading={loading} />
      </div>

      {/* List */}
      {loading && logs.length === 0 ? (
        <div className={styles.center}><Spin /></div>
      ) : logs.length === 0 ? (
        <div className={styles.center}>
          <div className={styles.emptyIcon}><SearchOutlined /></div>
          <div className={styles.emptyText}>暂无日志</div>
        </div>
      ) : (
        <div className={styles.list}>
          {logs.map((entry, idx) => (
            <LogRow
              key={`${entry.timestamp}-${idx}`}
              entry={entry}
              expanded={expandedIdx === idx}
              onToggle={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <Button size="small" disabled={page === 0} onClick={() => setPage(page - 1)}>上一页</Button>
          <span className={styles.pageInfo}>{page + 1} / {totalPages}（共 {total} 条）</span>
          <Button size="small" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>下一页</Button>
        </div>
      )}
    </Drawer>
  );
}

// ============ Log Row ============

function LogRow({ entry, expanded, onToggle }: { entry: LogEntry; expanded: boolean; onToggle: () => void }) {
  const levelColor = LEVEL_COLORS[entry.level] || "#999";
  const categoryLabel = CATEGORY_LABELS[entry.category] || entry.category;
  const time = new Date(entry.timestamp.endsWith("Z") ? entry.timestamp : entry.timestamp + "Z").toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className={`${styles.logItem} ${expanded ? styles.logItemExpanded : ""}`}>
      <button className={styles.logHeader} onClick={onToggle}>
        <span className={styles.logLevel} style={{ color: levelColor }}>{entry.level}</span>
        <span className={styles.logCategory}>{categoryLabel}</span>
        <span className={styles.logMessage}>{entry.message}</span>
        <span className={styles.logTime}>{time}</span>
        <span className={`${styles.logArrow} ${expanded ? styles.logArrowOpen : ""}`}>▾</span>
      </button>
      {expanded && entry.meta && (
        <div className={styles.logBody}>
          <pre className={styles.logMeta}>{JSON.stringify(entry.meta, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
