/**
 * 安全解析 JSON 字符串，失败时返回 fallback。
 */
export function parseJsonSafe<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw || "null") as T;
  } catch {
    return fallback;
  }
}

/**
 * 安全解析 JSON 数组字符串，失败或非数组时返回 []。
 */
export function parseJsonArray(raw: string): string[] {
  const result = parseJsonSafe<unknown[]>(raw, []);
  return Array.isArray(result) ? result.map(String) : [];
}
