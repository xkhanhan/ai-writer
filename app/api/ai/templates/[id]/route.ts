import { NextResponse } from "next/server";
import { jsonSuccess, jsonError } from "@/app/api/utils";
import {
  getPromptTemplate,
  updatePromptTemplate,
  deletePromptTemplate,
} from "@/server/storage/prompt-template-store";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const existing = await getPromptTemplate(id);
  if (!existing) {
    return jsonError("模板不存在。", 404);
  }

  if (existing.isDefault) {
    return jsonError("无法修改系统默认模板。", 400);
  }

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

  const updateData: Record<string, unknown> = {};

  if (typeof payload.displayName === "string") {
    updateData.displayName = payload.displayName.trim();
  }
  if (typeof payload.description === "string") {
    updateData.description = payload.description.trim();
  }
  if (typeof payload.template === "string") {
    updateData.template = payload.template.trim();
  }
  if (Array.isArray(payload.variables)) {
    updateData.variables = payload.variables;
  }
  if (typeof payload.isActive === "boolean") {
    updateData.isActive = payload.isActive;
  }

  if (Object.keys(updateData).length === 0) {
    return jsonError("至少需要一个更新字段。");
  }

  const updated = await updatePromptTemplate(id, updateData);
  return jsonSuccess({ template: updated });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const existing = await getPromptTemplate(id);
  if (!existing) {
    return jsonError("模板不存在。", 404);
  }

  if (existing.isDefault) {
    return jsonError("无法删除系统默认模板。", 400);
  }

  try {
    await deletePromptTemplate(id);
    return jsonSuccess({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "删除模板失败。";
    return jsonError(message, 500);
  }
}
