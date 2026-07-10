import { NextResponse } from "next/server";
import { jsonSuccess, jsonError } from "@/app/api/utils";
import {
  getPromptTemplatesByBook,
  createPromptTemplate,
  copyGlobalToBook,
  deleteBookOverride,
} from "@/server/storage/prompt-template-store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bookId = searchParams.get("bookId");
  const functionKey = searchParams.get("functionKey") ?? undefined;

  // bookId is required so we can include both book-specific and system-level templates
  if (!bookId) {
    return jsonError("bookId is required.");
  }

  const templates = await getPromptTemplatesByBook(bookId, functionKey);
  return jsonSuccess({ templates });
}

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

  const action = typeof payload.action === "string" ? payload.action : null;

  if (action === "copyGlobalToBook") {
    const bookId =
      typeof payload.bookId === "string" && payload.bookId.trim() !== ""
        ? payload.bookId.trim()
        : null;
    const functionKey =
      typeof payload.functionKey === "string"
        ? payload.functionKey.trim()
        : "";

    if (!bookId) {
      return jsonError("bookId is required for copyGlobalToBook.");
    }
    if (!functionKey) {
      return jsonError("functionKey is required for copyGlobalToBook.");
    }

    try {
      const template = await copyGlobalToBook(bookId, functionKey);
      return jsonSuccess({ template });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to copy global template.";
      return jsonError(message);
    }
  }

  if (action === "deleteBookOverride") {
    const bookId =
      typeof payload.bookId === "string" && payload.bookId.trim() !== ""
        ? payload.bookId.trim()
        : null;
    const functionKey =
      typeof payload.functionKey === "string"
        ? payload.functionKey.trim()
        : "";

    if (!bookId) {
      return jsonError("bookId is required for deleteBookOverride.");
    }
    if (!functionKey) {
      return jsonError("functionKey is required for deleteBookOverride.");
    }

    const deleted = await deleteBookOverride(bookId, functionKey);
    return jsonSuccess({ deleted });
  }

  // bookId is optional — null/absent means system-level template
  const bookId =
    typeof payload.bookId === "string" && payload.bookId.trim() !== ""
      ? payload.bookId.trim()
      : null;
  const functionKey =
    typeof payload.functionKey === "string" ? payload.functionKey.trim() : "";
  const displayName =
    typeof payload.displayName === "string" ? payload.displayName.trim() : "";
  const description =
    typeof payload.description === "string" ? payload.description.trim() : "";
  const template =
    typeof payload.template === "string" ? payload.template.trim() : "";
  const variables = Array.isArray(payload.variables) ? payload.variables : [];

  if (!functionKey) {
    return jsonError("functionKey is required.");
  }

  if (!displayName) {
    return jsonError("displayName is required.");
  }

  if (!template) {
    return jsonError("template is required.");
  }

  const newTemplate = await createPromptTemplate(bookId, {
    functionKey,
    displayName,
    description,
    template,
    variables,
  });

  return jsonSuccess({ template: newTemplate });
}
