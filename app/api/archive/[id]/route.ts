import { getArchivedChapterById, deleteArchivedChapter } from "@/server/storage/outline-store";
import { jsonSuccess, jsonError } from "@/app/api/utils";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const archive = await getArchivedChapterById(id);
    if (!archive) {
      return jsonError("存稿不存在", 404);
    }
    return jsonSuccess({ archive });
  } catch (error) {
    console.error("获取存稿失败:", error);
    return jsonError("获取存稿失败");
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const success = await deleteArchivedChapter(id);
    if (!success) {
      return jsonError("存稿不存在", 404);
    }
    return jsonSuccess({ success: true });
  } catch (error) {
    console.error("删除存稿失败:", error);
    return jsonError("删除存稿失败");
  }
}
