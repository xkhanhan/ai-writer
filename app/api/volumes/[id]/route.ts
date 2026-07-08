import { getVolumeById, updateVolume, deleteVolume } from "@/server/storage/outline-store";
import { jsonSuccess, jsonError } from "@/app/api/utils";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const volume = await getVolumeById(id);
    if (!volume) {
      return jsonError("卷纲不存在", 404);
    }
    return jsonSuccess({ volume });
  } catch (error) {
    console.error("获取卷纲失败:", error);
    return jsonError("获取卷纲失败");
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const volume = await updateVolume(id, body);
    if (!volume) {
      return jsonError("卷纲不存在", 404);
    }
    return jsonSuccess({ volume });
  } catch (error) {
    console.error("更新卷纲失败:", error);
    return jsonError("更新卷纲失败");
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const success = await deleteVolume(id);
    if (!success) {
      return jsonError("卷纲不存在", 404);
    }
    return jsonSuccess({ success: true });
  } catch (error) {
    console.error("删除卷纲失败:", error);
    return jsonError("删除卷纲失败");
  }
}
