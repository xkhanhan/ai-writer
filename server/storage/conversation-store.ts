/**
 * Conversation Store — manages agent conversations and messages.
 */

import { getDb } from "./db";
import { randomUUID } from "crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Conversation {
  id: string;
  book_id: string;
  scene_id: string;
  title: string;
  summary: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tool_calls: string | null;
  tool_call_id: string | null;
  name: string | null;
  created_at: string;
}

export interface CreateConversationInput {
  bookId: string;
  sceneId: string;
  title?: string;
}

export interface SaveMessageInput {
  conversationId: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  toolCalls?: unknown;
  toolCallId?: string;
  name?: string;
}

// ---------------------------------------------------------------------------
// Ensure tables exist
// ---------------------------------------------------------------------------

async function ensureTables() {
  const db = await getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_conversations (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL,
      scene_id TEXT NOT NULL,
      title TEXT DEFAULT '',
      summary TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_agent_conv_book ON agent_conversations(book_id);
    CREATE INDEX IF NOT EXISTS idx_agent_conv_scene ON agent_conversations(scene_id);

    CREATE TABLE IF NOT EXISTS agent_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT DEFAULT '',
      tool_calls TEXT,
      tool_call_id TEXT,
      name TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (conversation_id) REFERENCES agent_conversations(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_agent_msg_conv ON agent_messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_agent_msg_created ON agent_messages(created_at);
  `);
}

// ---------------------------------------------------------------------------
// CRUD — Conversations
// ---------------------------------------------------------------------------

export async function createConversation(
  input: CreateConversationInput
): Promise<Conversation> {
  await ensureTables();
  const db = await getDb();
  const id = randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO agent_conversations (id, book_id, scene_id, title, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, input.bookId, input.sceneId, input.title ?? "", now, now);

  return {
    id,
    book_id: input.bookId,
    scene_id: input.sceneId,
    title: input.title ?? "",
    summary: "",
    created_at: now,
    updated_at: now,
  };
}

export async function getConversation(
  id: string
): Promise<Conversation | null> {
  await ensureTables();
  const db = await getDb();
  return (
    (db
      .prepare("SELECT * FROM agent_conversations WHERE id = ?")
      .get(id) as Conversation) ?? null
  );
}

export async function getConversations(
  bookId: string,
  sceneId?: string
): Promise<Conversation[]> {
  await ensureTables();
  const db = await getDb();

  if (sceneId) {
    return db
      .prepare(
        "SELECT * FROM agent_conversations WHERE book_id = ? AND scene_id = ? ORDER BY updated_at DESC"
      )
      .all(bookId, sceneId) as Conversation[];
  }

  return db
    .prepare(
      "SELECT * FROM agent_conversations WHERE book_id = ? ORDER BY updated_at DESC"
    )
    .all(bookId) as Conversation[];
}

export async function updateConversation(
  id: string,
  data: { title?: string; summary?: string }
): Promise<void> {
  await ensureTables();
  const db = await getDb();
  const sets: string[] = ["updated_at = datetime('now')"];
  const values: unknown[] = [];

  if (data.title !== undefined) {
    sets.push("title = ?");
    values.push(data.title);
  }
  if (data.summary !== undefined) {
    sets.push("summary = ?");
    values.push(data.summary);
  }

  values.push(id);
  db.prepare(
    `UPDATE agent_conversations SET ${sets.join(", ")} WHERE id = ?`
  ).run(...values);
}

export async function deleteConversation(id: string): Promise<void> {
  await ensureTables();
  const db = await getDb();
  db.prepare("DELETE FROM agent_conversations WHERE id = ?").run(id);
}

// ---------------------------------------------------------------------------
// CRUD — Messages
// ---------------------------------------------------------------------------

export async function saveMessage(
  input: SaveMessageInput
): Promise<ConversationMessage> {
  await ensureTables();
  const db = await getDb();
  const id = randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO agent_messages (id, conversation_id, role, content, tool_calls, tool_call_id, name, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.conversationId,
    input.role,
    input.content,
    input.toolCalls ? JSON.stringify(input.toolCalls) : null,
    input.toolCallId ?? null,
    input.name ?? null,
    now
  );

  // Update conversation timestamp
  db.prepare(
    "UPDATE agent_conversations SET updated_at = datetime('now') WHERE id = ?"
  ).run(input.conversationId);

  return {
    id,
    conversation_id: input.conversationId,
    role: input.role,
    content: input.content,
    tool_calls: input.toolCalls ? JSON.stringify(input.toolCalls) : null,
    tool_call_id: input.toolCallId ?? null,
    name: input.name ?? null,
    created_at: now,
  };
}

export async function getMessages(
  conversationId: string
): Promise<ConversationMessage[]> {
  await ensureTables();
  const db = await getDb();
  return db
    .prepare(
      "SELECT * FROM agent_messages WHERE conversation_id = ? ORDER BY created_at ASC"
    )
    .all(conversationId) as ConversationMessage[];
}

export async function getRecentMessages(
  conversationId: string,
  limit: number = 50
): Promise<ConversationMessage[]> {
  await ensureTables();
  const db = await getDb();
  return db
    .prepare(
      "SELECT * FROM agent_messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT ?"
    )
    .all(conversationId, limit)
    .reverse() as ConversationMessage[];
}

export async function deleteMessages(conversationId: string): Promise<void> {
  await ensureTables();
  const db = await getDb();
  db.prepare(
    "DELETE FROM agent_messages WHERE conversation_id = ?"
  ).run(conversationId);
}

export async function getMessageCount(
  conversationId: string
): Promise<number> {
  await ensureTables();
  const db = await getDb();
  const row = db
    .prepare(
      "SELECT COUNT(*) as count FROM agent_messages WHERE conversation_id = ?"
    )
    .get(conversationId) as { count: number };
  return row.count;
}
