import { jsonSuccess, jsonError } from "@/app/api/utils";
import { sanitizeTemplate } from "@/server/ai/prompt-sanitizer";

/**
 * POST /api/ai/sanitize
 *
 * Body: { content: string }
 *
 * Sanitizes user-edited template content to detect prompt injection.
 * Returns warnings and cleaned content.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("请求体必须是 JSON。");
  }

  const payload = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const content = typeof payload.content === "string" ? payload.content : "";

  if (!content) return jsonError("content is required.");

  const result = sanitizeTemplate(content);
  return jsonSuccess(result);
}
