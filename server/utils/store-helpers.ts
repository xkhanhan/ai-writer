type FieldEntry = [string, string | number | boolean | null];

/**
 * Build a parameterized UPDATE SET clause from a field map.
 * Returns { sql, values } where sql is like `"col1 = ?, col2 = ?"` and values is the parameter array.
 * Returns null if no non-undefined entries exist (caller should no-op).
 *
 * Callers transform their DTO values before inserting into fieldMap (e.g. trim(),
 * boolean→number, JSON.stringify). The helper only handles SQL generation.
 *
 * extraSetClauses: additional SET fragments appended after the field entries,
 * e.g. ["updated_at = datetime('now')"]. These do not add to the values array.
 */
export function buildUpdateSet<T extends Record<string, unknown>>(
  tableName: string,
  fieldMap: T,
  extraSetClauses?: string[]
): { sql: string; values: FieldEntry[1][] } | null {
  const entries = Object.entries(fieldMap).filter(
    (pair): pair is FieldEntry => pair[1] !== undefined
  );
  if (entries.length === 0) return null;

  const setClauses = entries.map(([key]) => `${key} = ?`);
  if (extraSetClauses) setClauses.push(...extraSetClauses);

  return {
    sql: `UPDATE ${tableName} SET ${setClauses.join(", ")} WHERE id = ?`,
    values: entries.map(([, v]) => v),
  };
}
