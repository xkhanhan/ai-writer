import { jsonSuccess, jsonError } from "@/app/api/utils";
import { activateTemplate } from "@/server/storage/prompt-template-store";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("请求体必须是 JSON。");
  }

  const payload =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {};

  const templateId =
    typeof payload.templateId === "string" && payload.templateId.trim() !== ""
      ? payload.templateId.trim()
      : null;

  if (!templateId) {
    return jsonError("templateId is required.");
  }

  try {
    const template = await activateTemplate(templateId);
    if (!template) {
      return jsonError("模板不存在", 404);
    }
    return jsonSuccess({ template });
  } catch (err) {
    const message = err instanceof Error ? err.message : "激活模板失败";
    return jsonError(message, 500);
  }
}
