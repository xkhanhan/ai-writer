"use client";

import { useState, useEffect, useCallback } from "react";
import { Drawer, Spin, Button, Tag } from "antd";
import { ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import type { AiGenerationSession } from "@/shared/types";
import styles from "./index.module.css";

const FUNCTION_KEY_LABELS: Record<string, string> = {
  content_generate: "正文生成",
  review_extract: "过审提取",
  polish: "润色",
  deslop: "去AI味",
  expand: "扩写",
  character_audit: "角色审计",
  fact_consistency: "事实检查",
  book_synopsis_expand: "简介扩写",
  book_info_suggest: "书籍建议",
  world_rule_suggest: "规则建议",
  outline_optimize: "总纲优化",
  volume_generate: "卷纲生成",
};

const FUNCTION_KEY_COLORS: Record<string, string> = {
  content_generate: "blue",
  outline_optimize: "purple",
  volume_generate: "cyan",
  polish: "green",
  deslop: "orange",
  expand: "geekblue",
};

interface Props {
  open: boolean;
  bookId: string;
  refreshKey?: number;
  onClose: () => void;
}

export function AiLogDrawer({ open, bookId, refreshKey, onClose }: Props) {
  const [logs, setLogs] = useState<AiGenerationSession[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [filterKey, setFilterKey] = useState<string | undefined>(undefined);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const limit = 20;

  const fetchLogs = useCallback(async () => {
    if (!bookId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        bookId,
        limit: String(limit),
        offset: String(page * limit),
      });
      if (filterKey) params.set("functionKey", filterKey);

      const res = await fetch(`/api/ai/logs?${params}`);
      if (res.ok) {
        const data = await res.json() as { items: AiGenerationSession[]; total: number };
        setLogs(data.items);
        setTotal(data.total);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [bookId, page, filterKey]);

  useEffect(() => {
    if (open) {
      setPage(0);
      fetchLogs();
    }
  }, [open, fetchLogs, refreshKey]);

  const totalPages = Math.ceil(total / limit);

  return (
    <Drawer
      title="AI 日志"
      open={open}
      onClose={onClose}
      width={640}
      destroyOnClose
    >
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.filterGroup}>
          <FilterButton label="全部" active={!filterKey} onClick={() => setFilterKey(undefined)} />
          {Object.keys(FUNCTION_KEY_LABELS).map((key) => (
            <FilterButton
              key={key}
              label={FUNCTION_KEY_LABELS[key]}
              active={filterKey === key}
              onClick={() => { setFilterKey(filterKey === key ? undefined : key); setPage(0); }}
            />
          ))}
        </div>
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
          {logs.map((log) => (
            <LogItem
              key={log.id}
              log={log}
              expanded={expandedId === log.id}
              onToggle={() => setExpandedId(expandedId === log.id ? null : log.id)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <Button size="small" disabled={page === 0} onClick={() => setPage(page - 1)}>上一页</Button>
          <span className={styles.pageInfo}>{page + 1} / {totalPages}</span>
          <Button size="small" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>下一页</Button>
        </div>
      )}
    </Drawer>
  );
}

function FilterButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      className={`${styles.filterBtn} ${active ? styles.filterBtnActive : ""}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function LogItem({ log, expanded, onToggle }: { log: AiGenerationSession; expanded: boolean; onToggle: () => void }) {
  const label = FUNCTION_KEY_LABELS[log.functionKey] || log.functionKey;
  const color = FUNCTION_KEY_COLORS[log.functionKey] || "default";
  // SQLite datetime('now') stores UTC without timezone; append 'Z' so JS parses as UTC correctly
  const time = new Date(log.createdAt.endsWith("Z") ? log.createdAt : log.createdAt + "Z").toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`${styles.logItem} ${expanded ? styles.logItemExpanded : ""}`}>
      <button className={styles.logHeader} onClick={onToggle}>
        <div className={styles.logHeaderLeft}>
          <Tag color={color} className={styles.logTag}>{label}</Tag>
          {log.model && <span className={styles.logModel}>{log.model}</span>}
        </div>
        <div className={styles.logHeaderRight}>
          {log.latencyMs > 0 && (
            <span className={styles.logLatency}>{log.latencyMs}ms</span>
          )}
          <span className={styles.logTime}>{time}</span>
          <span className={`${styles.logArrow} ${expanded ? styles.logArrowOpen : ""}`}>▾</span>
        </div>
      </button>

      {expanded && (
        <div className={styles.logBody}>
          <LogSection title="System Prompt" content={log.inputContext} />
          <LogSection title="User Prompt" content={log.userInput} />
          <LogSection title="AI 输出" content={log.rawOutput} highlight />
          {!log.rawOutput && (
            <div className={styles.logNoOutput}>（输出未记录 — 流式模式下部分日志不包含完整输出）</div>
          )}
        </div>
      )}
    </div>
  );
}

function LogSection({ title, content, highlight }: { title: string; content: string; highlight?: boolean }) {
  if (!content) return null;
  return (
    <div className={`${styles.logSection} ${highlight ? styles.logSectionHighlight : ""}`}>
      <div className={styles.logSectionTitle}>{title}</div>
      <pre className={styles.logSectionContent}>{content}</pre>
    </div>
  );
}
