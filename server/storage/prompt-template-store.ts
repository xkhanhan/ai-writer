import { randomUUID } from "node:crypto";
import { getDb } from "@/server/storage/db";

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
    variables: JSON.parse(row.variables ?? "[]") as PromptVariable[],
    isDefault: row.is_default === 1,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getPromptTemplatesByBook(
  bookId: string,
  functionKey?: string,
): Promise<PromptTemplate[]> {
  const db = await getDb();
  if (functionKey) {
    const rows = db
      .prepare(
        `SELECT * FROM prompt_templates
         WHERE (book_id = ? OR book_id IS NULL) AND function_key = ?
         ORDER BY created_at DESC`,
      )
      .all(bookId, functionKey) as PromptTemplateRow[];
    return rows.map(mapRow);
  }
  const rows = db
    .prepare(
      `SELECT * FROM prompt_templates
       WHERE book_id = ? OR book_id IS NULL
       ORDER BY created_at DESC`,
    )
    .all(bookId) as PromptTemplateRow[];
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
  const fields: string[] = [];
  const values: Array<string | number> = [];

  if (data.displayName !== undefined) {
    fields.push("display_name = ?");
    values.push(data.displayName);
  }
  if (data.description !== undefined) {
    fields.push("description = ?");
    values.push(data.description);
  }
  if (data.template !== undefined) {
    fields.push("template = ?");
    values.push(data.template);
  }
  if (data.variables !== undefined) {
    fields.push("variables = ?");
    values.push(JSON.stringify(data.variables));
  }
  if (data.isActive !== undefined) {
    fields.push("is_active = ?");
    values.push(data.isActive ? 1 : 0);
  }

  if (fields.length === 0) {
    return getPromptTemplate(id);
  }

  fields.push("updated_at = datetime('now')");
  values.push(id);

  db.prepare(
    `UPDATE prompt_templates SET ${fields.join(", ")} WHERE id = ?`,
  ).run(...values);

  return getPromptTemplate(id);
}

export async function deletePromptTemplate(id: string): Promise<boolean> {
  const db = await getDb();
  const row = db
    .prepare(`SELECT is_default FROM prompt_templates WHERE id = ?`)
    .get(id) as { is_default: number } | undefined;

  if (!row) return false;
  if (row.is_default === 1) {
    throw new Error("Cannot delete a system default template.");
  }

  const result = db
    .prepare(`DELETE FROM prompt_templates WHERE id = ?`)
    .run(id);
  return result.changes > 0;
}

export async function getActivePromptTemplate(
  bookId: string,
  functionKey: string,
): Promise<PromptTemplate | null> {
  const db = await getDb();

  // Priority 1: book-specific active template
  const active = db
    .prepare(
      `SELECT * FROM prompt_templates
       WHERE book_id = ? AND function_key = ? AND is_active = 1
       LIMIT 1`,
    )
    .get(bookId, functionKey) as PromptTemplateRow | undefined;

  if (active) return mapRow(active);

  // Priority 2: system-level default template
  const systemDefault = db
    .prepare(
      `SELECT * FROM prompt_templates
       WHERE book_id IS NULL AND function_key = ? AND is_default = 1
       LIMIT 1`,
    )
    .get(functionKey) as PromptTemplateRow | undefined;

  if (systemDefault) return mapRow(systemDefault);

  // Priority 3: book-specific default (legacy fallback)
  const bookDefault = db
    .prepare(
      `SELECT * FROM prompt_templates
       WHERE book_id = ? AND function_key = ? AND is_default = 1
       LIMIT 1`,
    )
    .get(bookId, functionKey) as PromptTemplateRow | undefined;

  return bookDefault ? mapRow(bookDefault) : null;
}
