import path from "path";
import { promises as fs } from "fs";

// ============ Types ============

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";
export type LogCategory = "request" | "data" | "error" | "user" | "ai" | "system";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  meta?: Record<string, unknown>;
}

export interface LogQueryOptions {
  level?: LogLevel;
  category?: LogCategory;
  keyword?: string;
  limit?: number;
  offset?: number;
}

// ============ Constants ============

const LOG_DIR = path.join(process.cwd(), "data", "logs");
const FLUSH_INTERVAL_MS = 2000;
const MAX_BUFFER_SIZE = 50;

// ============ Logger singleton ============

class Logger {
  private buffer: LogEntry[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private initialized = false;

  private async ensureDir() {
    if (this.initialized) return;
    await fs.mkdir(LOG_DIR, { recursive: true });
    this.initialized = true;
    // Start periodic flush
    this.flushTimer = setInterval(() => {
      void this.flush();
    }, FLUSH_INTERVAL_MS);
    // Prevent timer from keeping process alive
    if (this.flushTimer.unref) this.flushTimer.unref();
  }

  private getLogFilePath(date?: Date): string {
    const d = date ?? new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return path.join(LOG_DIR, `${yyyy}-${mm}-${dd}.log`);
  }

  private formatEntry(entry: LogEntry): string {
    const { timestamp, level, category, message, meta } = entry;
    const metaStr = meta ? ` | ${JSON.stringify(meta)}` : "";
    return `[${timestamp}] [${level}] [${category}] ${message}${metaStr}\n`;
  }

  // Write a single log entry (used by query to parse)
  static parseLine(line: string): LogEntry | null {
    const match = line.match(
      /^\[([^\]]+)\]\s+\[(\w+)\]\s+\[(\w+)\]\s+(.*?)(?:\s+\|\s+(.*))?$/,
    );
    if (!match) return null;
    return {
      timestamp: match[1],
      level: match[2] as LogLevel,
      category: match[3] as LogCategory,
      message: match[4],
      meta: match[5] ? JSON.parse(match[5]) as Record<string, unknown> : undefined,
    };
  }

  // ---- Core write ----

  log(level: LogLevel, category: LogCategory, message: string, meta?: Record<string, unknown>) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      meta: meta && Object.keys(meta).length > 0 ? meta : undefined,
    };
    this.buffer.push(entry);

    // Also write to console for development
    const consoleMsg = `[${level}][${category}] ${message}`;
    if (level === "ERROR") {
      console.error(consoleMsg, meta ?? "");
    } else if (level === "WARN") {
      console.warn(consoleMsg, meta ?? "");
    } else {
      console.log(consoleMsg, meta ? JSON.stringify(meta) : "");
    }

    // Flush immediately if buffer is large
    if (this.buffer.length >= MAX_BUFFER_SIZE) {
      void this.flush();
    }
  }

  // ---- Convenience methods ----

  debug(category: LogCategory, message: string, meta?: Record<string, unknown>) {
    this.log("DEBUG", category, message, meta);
  }

  info(category: LogCategory, message: string, meta?: Record<string, unknown>) {
    this.log("INFO", category, message, meta);
  }

  warn(category: LogCategory, message: string, meta?: Record<string, unknown>) {
    this.log("WARN", category, message, meta);
  }

  error(category: LogCategory, message: string, meta?: Record<string, unknown>) {
    this.log("ERROR", category, message, meta);
  }

  // ---- Flush buffer to file ----

  async flush() {
    if (this.buffer.length === 0) return;
    await this.ensureDir();

    const entries = this.buffer.splice(0);
    const filePath = this.getLogFilePath();
    const content = entries.map((e) => this.formatEntry(e)).join("");

    try {
      await fs.appendFile(filePath, content, "utf-8");
    } catch (err) {
      // If file write fails, put entries back and log to console
      this.buffer.unshift(...entries);
      console.error("[Logger] Failed to write log file:", err);
    }
  }

  // ---- Query logs ----

  async query(options: LogQueryOptions = {}): Promise<{ entries: LogEntry[]; total: number }> {
    const { level, category, keyword, limit = 100, offset = 0 } = options;

    // Read the most recent log files (today + yesterday)
    const files = await this.getLogFiles();
    const allEntries: LogEntry[] = [];

    for (const file of files) {
      try {
        const content = await fs.readFile(file, "utf-8");
        for (const line of content.split("\n")) {
          if (!line.trim()) continue;
          const entry = Logger.parseLine(line);
          if (entry) allEntries.push(entry);
        }
      } catch {
        // File might not exist, skip
      }
    }

    // Apply filters
    let filtered = allEntries;
    if (level) filtered = filtered.filter((e) => e.level === level);
    if (category) filtered = filtered.filter((e) => e.category === category);
    if (keyword) {
      const kw = keyword.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.message.toLowerCase().includes(kw) ||
          JSON.stringify(e.meta ?? {}).toLowerCase().includes(kw),
      );
    }

    // Sort by timestamp descending (newest first)
    filtered.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    const total = filtered.length;
    const entries = filtered.slice(offset, offset + limit);

    return { entries, total };
  }

  private async getLogFiles(): Promise<string[]> {
    try {
      const files = await fs.readdir(LOG_DIR);
      return files
        .filter((f) => f.endsWith(".log"))
        .sort()
        .reverse()
        .slice(0, 3) // Last 3 days
        .map((f) => path.join(LOG_DIR, f));
    } catch {
      return [];
    }
  }
}

// ============ Export singleton ============

export const logger = new Logger();

// ============ Request logging helper ============

export function logRequest(
  method: string,
  path: string,
  statusCode: number,
  durationMs: number,
  meta?: Record<string, unknown>,
) {
  const level: LogLevel = statusCode >= 500 ? "ERROR" : statusCode >= 400 ? "WARN" : "INFO";
  logger.log(level, "request", `${method} ${path} ${statusCode} ${durationMs}ms`, meta);
}

// ============ Data operation logging helper ============

export function logDataOp(
  operation: string,
  table: string,
  meta?: Record<string, unknown>,
) {
  logger.info("data", `${operation} ${table}`, meta);
}

// ============ User action logging helper ============

export function logUserAction(
  action: string,
  meta?: Record<string, unknown>,
) {
  logger.info("user", action, meta);
}

// ============ AI operation logging helper ============

export function logAiOp(
  action: string,
  meta?: Record<string, unknown>,
) {
  logger.info("ai", action, meta);
}

// ============ Graceful shutdown ============

export async function flushLogs() {
  await logger.flush();
}
