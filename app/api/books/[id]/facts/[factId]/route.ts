import { jsonSuccess, jsonError } from "@/app/api/utils";
import {
  getStoryFactById,
  updateStoryFact,
  deleteStoryFact,
} from "@/server/storage/fact-store";

interface FactRouteParams {
  params: Promise<{ id: string; factId: string }>;
}

export async function GET(_request: Request, { params }: FactRouteParams) {
  try {
    const { factId } = await params;
    const fact = await getStoryFactById(factId);
    if (!fact) {
      return jsonError("事实不存在", 404);
    }
    return jsonSuccess({ fact });
  } catch (error) {
    console.error("获取事实详情失败:", error);
    return jsonError("获取事实详情失败", 500);
  }
}

export async function PATCH(request: Request, { params }: FactRouteParams) {
  try {
    const { factId } = await params;
    const body = await request.json();
    const fact = await updateStoryFact(factId, body);
    if (!fact) {
      return jsonError("事实不存在", 404);
    }
    return jsonSuccess({ fact });
  } catch (error) {
    console.error("更新事实失败:", error);
    return jsonError("更新事实失败", 500);
  }
}

export async function DELETE(_request: Request, { params }: FactRouteParams) {
  try {
    const { factId } = await params;
    const deleted = await deleteStoryFact(factId);
    if (!deleted) {
      return jsonError("事实不存在", 404);
    }
    return jsonSuccess({ success: true });
  } catch (error) {
    console.error("删除事实失败:", error);
    return jsonError("删除事实失败", 500);
  }
}
