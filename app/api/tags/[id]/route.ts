import { jsonError, jsonSuccess } from "@/app/api/utils";
import {
  getTagCategoryById,
  updateTagCategory,
  deleteTagCategory,
} from "@/server/storage/tag-store";

interface TagRouteParams {
  params: Promise<{ id: string }>;
}

const ALLOWED_PATCH_FIELDS = [
  "name",
  "code",
  "parentId",
  "description",
  "sortOrder",
] as const;

export async function GET(_request: Request, { params }: TagRouteParams) {
  try {
    const { id } = await params;
    const tag = await getTagCategoryById(id);

    if (!tag) {
      return jsonError("标签不存在", 404);
    }

    return jsonSuccess({ success: true, tag });
  } catch (error) {
    console.error("获取标签失败:", error);
    return jsonError("获取标签失败", 500);
  }
}

export async function PATCH(request: Request, { params }: TagRouteParams) {
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

    const tag = await updateTagCategory(id, updateData);

    if (!tag) {
      return jsonError("标签不存在", 404);
    }

    return jsonSuccess({ success: true, tag });
  } catch (error) {
    console.error("更新标签失败:", error);
    return jsonError("更新标签失败", 500);
  }
}

export async function DELETE(_request: Request, { params }: TagRouteParams) {
  try {
    const { id } = await params;
    const success = await deleteTagCategory(id);

    if (!success) {
      return jsonError("标签不存在", 404);
    }

    return jsonSuccess({ success: true });
  } catch (error) {
    console.error("删除标签失败:", error);
    return jsonError("删除标签失败", 500);
  }
}
