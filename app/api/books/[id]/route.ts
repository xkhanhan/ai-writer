import { NextResponse } from "next/server";
import { jsonError, jsonSuccess } from "@/app/api/utils";
import { getBookById, updateBook, deleteBook } from "@/server/storage/book-store";

interface BookRouteParams {
  params: Promise<{ id: string }>;
}

const ALLOWED_PATCH_FIELDS = [
  "title",
  "description",
  "genre",
  "platform",
  "writingStyle",
  "targetWordCount",
  "status",
  "cover",
] as const;

export async function GET(request: Request, { params }: BookRouteParams) {
  try {
    const { id } = await params;
    const book = await getBookById(id);

    if (!book) {
      return jsonError("书籍不存在", 404);
    }

    return jsonSuccess({ success: true, book });
  } catch (error) {
    console.error("获取书籍失败:", error);
    return jsonError("获取书籍失败", 500);
  }
}

export async function PATCH(request: Request, { params }: BookRouteParams) {
  try {
    const { id } = await params;

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
    for (const key of ALLOWED_PATCH_FIELDS) {
      if (key in payload) {
        updateData[key] = payload[key];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return jsonError("至少需要一个更新字段。");
    }

    const success = await updateBook(id, updateData);

    if (!success) {
      return jsonError("书籍不存在或未修改", 404);
    }

    return jsonSuccess({ success: true });
  } catch (error) {
    console.error("更新书籍失败:", error);
    return jsonError("更新书籍失败", 500);
  }
}

export async function DELETE(request: Request, { params }: BookRouteParams) {
  try {
    const { id } = await params;
    const success = await deleteBook(id);

    if (!success) {
      return jsonError("书籍不存在", 404);
    }

    return jsonSuccess({ success: true });
  } catch (error) {
    console.error("删除书籍失败:", error);
    return jsonError("删除书籍失败", 500);
  }
}
