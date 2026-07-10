/**
 * Extract and parse JSON from AI response text.
 *
 * Strategy:
 *   1. Direct JSON.parse()
 *   2. Extract from markdown code blocks (```json ... ```)
 *   3. Find first { and last } in the text
 */
export function parseAiJson<T>(raw: string): { ok: true; data: T } | { ok: false; warning: string } {
  // Step 1: direct parse
  try {
    return { ok: true, data: JSON.parse(raw) as T };
  } catch {
    // continue to step 2
  }

  // Step 2: extract from markdown code block
  const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch?.[1]) {
    try {
      return { ok: true, data: JSON.parse(codeBlockMatch[1].trim()) as T };
    } catch {
      // continue to step 3
    }
  }

  // Step 3: find first { and last }
  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return { ok: true, data: JSON.parse(raw.slice(firstBrace, lastBrace + 1)) as T };
    } catch {
      // fall through
    }
  }

  return { ok: false, warning: "Failed to parse JSON from AI response" };
}
