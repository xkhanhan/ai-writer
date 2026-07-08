import { getChapterById, updateChapter, deleteChapter } from "@/server/storage/outline-store";
import { jsonSuccess, jsonError } from "@/app/api/utils";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const chapter = await getChapterById(id);
    if (!chapter) {
      return jsonError("章纲不存在", 404);
    }
    return jsonSuccess({ chapter });
  } catch (error) {
    console.error("获取章纲失败:", error);
    return jsonError("获取章纲失败");
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const chapter = await updateChapter(id, body);
    if (!chapter) {
      return jsonError("章纲不存在", 404);
    }
    return jsonSuccess({ chapter });
  } catch (error) {
    console.error("更新章纲失败:", error);
    return jsonError("更新章纲失败");
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const success = await deleteChapter(id);
    if (!success) {
      return jsonError("章纲不存在", 404);
    }
    return jsonSuccess({ success: true });
  } catch (error) {
    console.error("删除章纲失败:", error);
    return jsonError("删除章纲失败");
  }
}
