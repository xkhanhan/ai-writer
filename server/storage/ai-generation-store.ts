import { randomUUID } from "node:crypto";
import { getDb } from "@/server/storage/db";
import { buildUpdateSet } from "@/server/utils/store-helpers";
import type {
  AiGenerationSession,
  CreateGenerationSessionDTO,
} from "@/shared/types";

// ============ Row 类型 ============

type AiGenerationSessionRow = {
  id: string;
  book_id: string;
  function_key: string;
  chapter_id: string | null;
  prompt_template_id: string | null;
  input_context: string;
  user_input: string;
  raw_output: string;
  adopted: number;
  model: string;
  tokens_input: number;
  tokens_output: number;
  latency_ms: number;
  created_at: string;
};

// ============ 映射函数 ============

function mapSession(row: AiGenerationSessionRow): AiGenerationSession {
  return {
    id: row.id,
    bookId: row.book_id,
    functionKey: row.function_key,
    chapterId: row.chapter_id,
    promptTemplateId: row.prompt_template_id,
    inputContext: row.input_context,
    userInput: row.user_input,
    rawOutput: row.raw_output,
    adopted: row.adopted === 1,
    model: row.model,
    tokensInput: row.tokens_input,
    tokensOutput: row.tokens_output,
    latencyMs: row.latency_ms,
    createdAt: row.created_at,
  };
}

// ============ 创建 ============

export async function createGenerationSession(
  data: CreateGenerationSessionDTO
): Promise<AiGenerationSession> {
  const db = await getDb();
  const id = randomUUID();

  db.prepare(
    `INSERT INTO ai_generation_sessions (id, book_id, function_key, chapter_id, prompt_template_id, input_context, user_input, model)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    data.bookId,
    data.functionKey,
    data.chapterId ?? null,
    data.promptTemplateId ?? null,
    data.inputContext ?? "",
    data.userInput ?? "",
    data.model ?? ""
  );

  const row = db
    .prepare("SELECT * FROM ai_generation_sessions WHERE id = ?")
    .get(id) as AiGenerationSessionRow;
  return mapSession(row);
}

// ============ 更新 ============

export async function updateGenerationSession(
  id: string,
  data: {
    rawOutput?: string;
    adopted?: boolean;
    tokensInput?: number;
    tokensOutput?: number;
    latencyMs?: number;
  }
): Promise<AiGenerationSession | null> {
  const db = await getDb();
  const fieldMap = {
    raw_output: data.rawOutput,
    adopted: data.adopted !== undefined ? (data.adopted ? 1 : 0) : undefined,
    tokens_input: data.tokensInput,
    tokens_output: data.tokensOutput,
    latency_ms: data.latencyMs,
  };

  const update = buildUpdateSet("ai_generation_sessions", fieldMap);
  if (!update) {
    const row = db
      .prepare("SELECT * FROM ai_generation_sessions WHERE id = ?")
      .get(id) as AiGenerationSessionRow | undefined;
    return row ? mapSession(row) : null;
  }

  db.prepare(update.sql).run(...update.values, id);

  const row = db
    .prepare("SELECT * FROM ai_generation_sessions WHERE id = ?")
    .get(id) as AiGenerationSessionRow | undefined;
  return row ? mapSession(row) : null;
}

// ============ 查询 ============

export async function getGenerationSessionsByBook(
  bookId: string,
  limit?: number
): Promise<AiGenerationSession[]> {
  const db = await getDb();
  const sql = limit
    ? "SELECT * FROM ai_generation_sessions WHERE book_id = ? ORDER BY created_at DESC LIMIT ?"
    : "SELECT * FROM ai_generation_sessions WHERE book_id = ? ORDER BY created_at DESC";
  const rows = (
    limit
      ? db.prepare(sql).all(bookId, limit)
      : db.prepare(sql).all(bookId)
  ) as AiGenerationSessionRow[];
  return rows.map(mapSession);
}

export async function getGenerationSessionsByChapter(
  chapterId: string
): Promise<AiGenerationSession[]> {
  const db = await getDb();
  const rows = db
    .prepare(
      "SELECT * FROM ai_generation_sessions WHERE chapter_id = ? ORDER BY created_at DESC"
    )
    .all(chapterId) as AiGenerationSessionRow[];
  return rows.map(mapSession);
}

export async function getAdoptionRate(
  bookId: string
): Promise<{ adopted: number; total: number }> {
  const db = await getDb();
  const row = db
    .prepare(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN adopted = 1 THEN 1 ELSE 0 END) AS adopted
       FROM ai_generation_sessions
       WHERE book_id = ?`
    )
    .get(bookId) as { total: number; adopted: number };
  return { adopted: row.adopted ?? 0, total: row.total ?? 0 };
}
