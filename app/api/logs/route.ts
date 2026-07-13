import { NextResponse } from "next/server";
import { logger, flushLogs } from "@/server/logger";
import type { LogLevel, LogCategory } from "@/server/logger";
import { getDb } from "@/server/storage/db";

// ============ Unified log entry type ============

interface UnifiedLogEntry {
  id: string;
  timestamp: string;
  level: string;
  category: string;
  message: string;
  source: "system" | "ai";
  meta?: Record<string, unknown>;
}

// ============ GET: Query unified logs ============

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const level = searchParams.get("level") || undefined;
  const category = searchParams.get("category") || undefined;
  const keyword = searchParams.get("keyword") || undefined;
  const timeFrom = searchParams.get("timeFrom") || undefined;
  const timeTo = searchParams.get("timeTo") || undefined;
  const source = searchParams.get("source") as "system" | "ai" | null;
  const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 50;
  const offset = searchParams.get("offset") ? Number(searchParams.get("offset")) : 0;
  const exportFormat = searchParams.get("export");

  // Flush buffer before querying to get latest entries
  await flushLogs();

  // Collect from both sources
  const allEntries: UnifiedLogEntry[] = [];

  // 1. System logs (from file logger)
  if (!source || source === "system") {
    try {
      const sysResult = await logger.query({
        level: level as LogLevel | undefined,
        category: category as LogCategory | undefined,
        keyword,
        limit: 5000,
        offset: 0,
      });
      for (const entry of sysResult.entries) {
        allEntries.push({
          id: `sys-${entry.timestamp}`,
          timestamp: entry.timestamp,
          level: entry.level,
          category: entry.category,
          message: entry.message,
          source: "system",
          meta: entry.meta,
        });
      }
    } catch {
      // logger might not be initialized yet
    }
  }

  // 2. AI generation logs (from database)
  if (!source || source === "ai") {
    try {
      const db = await getDb();
      const aiLogs = db
        .prepare(
          `SELECT * FROM ai_generation_sessions ORDER BY created_at DESC LIMIT 5000`
        )
        .all() as Array<{
          id: string;
          book_id: string;
          function_key: string;
          chapter_id: string | null;
          input_context: string;
          user_input: string;
          raw_output: string;
          model: string;
          latency_ms: number;
          created_at: string;
        }>;

      for (const row of aiLogs) {
        const entry: UnifiedLogEntry = {
          id: `ai-${row.id}`,
          timestamp: row.created_at.endsWith("Z") ? row.created_at : row.created_at + "Z",
          level: "INFO",
          category: "ai",
          message: `AI 生成: ${row.function_key}`,
          source: "ai",
          meta: {
            functionKey: row.function_key,
            bookId: row.book_id,
            chapterId: row.chapter_id,
            model: row.model,
            latencyMs: row.latency_ms,
            systemPrompt: row.input_context?.slice(0, 200),
            userPrompt: row.user_input?.slice(0, 200),
            output: row.raw_output?.slice(0, 500),
          },
        };

        // Apply filters
        if (category && entry.category !== category) continue;
        if (level && entry.level !== level) continue;
        if (keyword) {
          const kw = keyword.toLowerCase();
          const searchable = `${entry.message} ${JSON.stringify(entry.meta ?? {})}`.toLowerCase();
          if (!searchable.includes(kw)) continue;
        }
        if (timeFrom && entry.timestamp < timeFrom) continue;
        if (timeTo && entry.timestamp > timeTo) continue;

        allEntries.push(entry);
      }
    } catch {
      // db might not be initialized
    }
  }

  // Apply time range filter for system logs
  let filtered = allEntries;
  if (timeFrom) {
    filtered = filtered.filter((e) => e.source === "ai" || e.timestamp >= timeFrom);
  }
  if (timeTo) {
    filtered = filtered.filter((e) => e.source === "ai" || e.timestamp <= timeTo);
  }

  // Sort by timestamp descending
  filtered.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  // Export mode
  if (exportFormat === "json" || exportFormat === "csv") {
    return exportLogs(filtered, exportFormat);
  }

  // Paginate
  const total = filtered.length;
  const entries = filtered.slice(offset, offset + limit);

  return NextResponse.json({ entries, total });
}

// ============ Export ============

function exportLogs(entries: UnifiedLogEntry[], format: "json" | "csv") {
  if (format === "json") {
    const body = JSON.stringify(entries, null, 2);
    return new Response(body, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="logs-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  }

  // CSV
  const header = "timestamp,level,category,source,message,meta\n";
  const rows = entries.map((e) =>
    [
      e.timestamp,
      e.level,
      e.category,
      e.source,
      `"${e.message.replace(/"/g, '""')}"`,
      `"${JSON.stringify(e.meta ?? {}).replace(/"/g, '""')}"`,
    ].join(",")
  ).join("\n");

  return new Response(header + rows, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="logs-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
