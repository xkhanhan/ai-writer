import { randomUUID } from "node:crypto";
import { getDb } from "@/server/storage/db";
import { parseJsonSafe } from "@/server/utils/json";
import { buildUpdateSet } from "@/server/utils/store-helpers";
import { PROMPT_TEMPLATE_SEEDS } from "./prompt-template-seeds";

export type PromptTemplateRow = {
  id: string;
  book_id: string | null;
  function_key: string;
  display_name: string;
  description: string;
  template: string;
  variables: string;
  is_default: number;
  is_active: number;
  created_at: string;
  updated_at: string;
};

export type PromptTemplate = {
  id: string;
  bookId: string | null;
  functionKey: string;
  displayName: string;
  description: string;
  template: string;
  variables: PromptVariable[];
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PromptVariable = {
  name: string;
  description: string;
  source: string;
  required: boolean;
};

export type CreatePromptTemplateDTO = {
  bookId?: string | null;  // optional, null for system-level templates
  functionKey: string;
  displayName: string;
  description?: string;
  template: string;
  variables?: PromptVariable[];
};

export type UpdatePromptTemplateDTO = {
  displayName?: string;
  description?: string;
  template?: string;
  variables?: PromptVariable[];
  isActive?: boolean;
};

function mapRow(row: PromptTemplateRow): PromptTemplate {
  return {
    id: row.id,
    bookId: row.book_id,
    functionKey: row.function_key,
    displayName: row.display_name,
    description: row.description ?? "",
    template: row.template,
    variables: parseJsonSafe<PromptVariable[]>(row.variables, []),
    isDefault: row.is_default === 1,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getPromptTemplatesByBook(
  functionKey?: string,
): Promise<PromptTemplate[]> {
  await ensureDefaultTemplates();
  const db = await getDb();
  if (functionKey) {
    const rows = db
      .prepare(
        `SELECT * FROM prompt_templates
         WHERE book_id IS NULL AND function_key = ?
         ORDER BY created_at DESC`,
      )
      .all(functionKey) as PromptTemplateRow[];
    return rows.map(mapRow);
  }
  const rows = db
    .prepare(
      `SELECT * FROM prompt_templates
       WHERE book_id IS NULL
       ORDER BY created_at DESC`,
    )
    .all() as PromptTemplateRow[];
  return rows.map(mapRow);
}

export async function getPromptTemplate(
  id: string,
): Promise<PromptTemplate | null> {
  const db = await getDb();
  const row = db
    .prepare(`SELECT * FROM prompt_templates WHERE id = ?`)
    .get(id) as PromptTemplateRow | undefined;
  return row ? mapRow(row) : null;
}

export async function createPromptTemplate(
  bookId: string | null | undefined,
  data: CreatePromptTemplateDTO,
): Promise<PromptTemplate> {
  const db = await getDb();
  const id = randomUUID();
  const finalBookId = data.bookId !== undefined ? data.bookId : (bookId ?? null);
  const variables = JSON.stringify(data.variables ?? []);

  db.prepare(
    `INSERT INTO prompt_templates (id, book_id, function_key, display_name, description, template, variables)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    finalBookId,
    data.functionKey,
    data.displayName,
    data.description ?? "",
    data.template,
    variables,
  );

  const row = db
    .prepare(`SELECT * FROM prompt_templates WHERE id = ?`)
    .get(id) as PromptTemplateRow;
  return mapRow(row);
}

export async function updatePromptTemplate(
  id: string,
  data: UpdatePromptTemplateDTO,
): Promise<PromptTemplate | null> {
  const db = await getDb();
  const fieldMap = {
    display_name: data.displayName,
    description: data.description,
    template: data.template,
    variables: data.variables !== undefined ? JSON.stringify(data.variables) : undefined,
    is_active: data.isActive !== undefined ? (data.isActive ? 1 : 0) : undefined,
  };

  const update = buildUpdateSet("prompt_templates", fieldMap, ["updated_at = datetime('now')"]);
  if (!update) return getPromptTemplate(id);

  db.prepare(update.sql).run(...update.values, id);
  return getPromptTemplate(id);
}

export async function deletePromptTemplate(id: string): Promise<boolean> {
  const db = await getDb();
  const row = db
    .prepare(`SELECT is_default, book_id FROM prompt_templates WHERE id = ?`)
    .get(id) as { is_default: number; book_id: string | null } | undefined;

  if (!row) return false;
  if (row.is_default === 1 && row.book_id === null) {
    throw new Error("Cannot delete a system default template.");
  }

  const result = db
    .prepare(`DELETE FROM prompt_templates WHERE id = ?`)
    .run(id);
  return result.changes > 0;
}

export async function copyAsCustom(
  sourceTemplateId: string,
): Promise<PromptTemplate> {
  const db = await getDb();

  const sourceRow = db
    .prepare(`SELECT * FROM prompt_templates WHERE id = ?`)
    .get(sourceTemplateId) as PromptTemplateRow | undefined;

  if (!sourceRow) {
    throw new Error(`Source template with id "${sourceTemplateId}" not found.`);
  }

  const newId = randomUUID();
  db.prepare(
    `INSERT INTO prompt_templates (id, book_id, function_key, display_name, description, template, variables, is_default, is_active)
     VALUES (?, NULL, ?, ?, ?, ?, ?, 0, 0)`,
  ).run(
    newId,
    sourceRow.function_key,
    sourceRow.display_name,
    sourceRow.description,
    sourceRow.template,
    sourceRow.variables,
  );

  const newRow = db
    .prepare(`SELECT * FROM prompt_templates WHERE id = ?`)
    .get(newId) as PromptTemplateRow;
  return mapRow(newRow);
}

export async function getAllFunctionKeys(): Promise<
  Array<{ functionKey: string; displayName: string; description: string }>
> {
  const db = await getDb();
  const rows = db
    .prepare(
      `SELECT DISTINCT function_key as functionKey,
              display_name as displayName,
              description
       FROM prompt_templates
       WHERE book_id IS NULL AND is_default = 1`,
    )
    .all() as Array<{ functionKey: string; displayName: string; description: string }>;
  return rows;
}

/**
 * Atomically activate a template: deactivate all templates for the same
 * functionKey, then activate the target — all in a single transaction.
 */
export async function activateTemplate(id: string): Promise<PromptTemplate | null> {
  const db = await getDb();

  const target = db
    .prepare("SELECT function_key FROM prompt_templates WHERE id = ?")
    .get(id) as { function_key: string } | undefined;
  if (!target) return null;

  const deactivate = db.prepare(
    "UPDATE prompt_templates SET is_active = 0, updated_at = datetime('now') WHERE function_key = ? AND is_active = 1"
  );
  const activate = db.prepare(
    "UPDATE prompt_templates SET is_active = 1, updated_at = datetime('now') WHERE id = ?"
  );

  const swap = db.transaction(() => {
    deactivate.run(target.function_key);
    activate.run(id);
  });
  swap();

  return getPromptTemplate(id);
}

export async function getActivePromptTemplate(
  functionKey: string,
): Promise<PromptTemplate | null> {
  // Lazy-seed: ensure system defaults exist on first call
  await ensureDefaultTemplates();

  const db = await getDb();

  // Priority 1: user global custom active template (not a system default)
  const globalCustom = db
    .prepare(
      `SELECT * FROM prompt_templates
       WHERE book_id IS NULL AND function_key = ? AND is_active = 1 AND is_default = 0
       LIMIT 1`,
    )
    .get(functionKey) as PromptTemplateRow | undefined;

  if (globalCustom) return mapRow(globalCustom);

  // Priority 2: system-level default template
  const systemDefault = db
    .prepare(
      `SELECT * FROM prompt_templates
       WHERE book_id IS NULL AND function_key = ? AND is_default = 1
       LIMIT 1`,
    )
    .get(functionKey) as PromptTemplateRow | undefined;

  return systemDefault ? mapRow(systemDefault) : null;
}

// ============================================================================
// Seed: system-level default templates
// ============================================================================

/** Sync seed templates to DB on every call. Runs once per server start. */
let _seedRan = false;

async function ensureDefaultTemplates(): Promise<void> {
  if (_seedRan) return;
  _seedRan = true;
  const db = await getDb();

  const existing = db
    .prepare(
      `SELECT id, function_key, template FROM prompt_templates WHERE book_id IS NULL AND is_default = 1`,
    )
    .all() as Array<{ id: string; function_key: string; template: string }>;

  const existingMap = new Map(existing.map((r) => [r.function_key, r]));

  const now = new Date().toISOString();

  const updateStmt = db.prepare(
    `UPDATE prompt_templates SET template = ?, updated_at = ? WHERE id = ?`,
  );
  const insertStmt = db.prepare(
    `INSERT INTO prompt_templates (id, book_id, function_key, display_name, description, template, variables, is_default, is_active, created_at, updated_at)
     VALUES (?, NULL, ?, ?, ?, ?, ?, 1, 0, ?, ?)`,
  );

  const tx = db.transaction(() => {
    let changed = false;
    for (const s of PROMPT_TEMPLATE_SEEDS) {
      const existingTemplate = existingMap.get(s.functionKey);
      if (existingTemplate) {
        if (existingTemplate.template !== s.template) {
          updateStmt.run(s.template, now, existingTemplate.id);
          changed = true;
        }
      } else {
        insertStmt.run(
          randomUUID(),
          s.functionKey,
          s.displayName,
          s.description,
          s.template,
          s.variables,
          now,
          now,
        );
        changed = true;
      }
    }
    if (changed) {
      console.log("[prompt-template-store] 种子模板已同步更新");
    }
  });
  tx();
}
