import { jsonSuccess, jsonError } from "@/app/api/utils";
import {
  getForeshadowById,
  updateForeshadow,
  deleteForeshadow,
} from "@/server/storage/foreshadow-store";

interface ForeshadowRouteParams {
  params: Promise<{ id: string; foreshadowId: string }>;
}

export async function GET(
  _request: Request,
  { params }: ForeshadowRouteParams
) {
  try {
    const { foreshadowId } = await params;
    const foreshadow = await getForeshadowById(foreshadowId);
    if (!foreshadow) {
      return jsonError("伏笔不存在", 404);
    }
    return jsonSuccess({ foreshadow });
  } catch (error) {
    console.error("获取伏笔详情失败:", error);
    return jsonError("获取伏笔详情失败", 500);
  }
}

export async function PATCH(
  request: Request,
  { params }: ForeshadowRouteParams
) {
  try {
    const { foreshadowId } = await params;
    const body = await request.json();
    const foreshadow = await updateForeshadow(foreshadowId, body);
    if (!foreshadow) {
      return jsonError("伏笔不存在", 404);
    }
    return jsonSuccess({ foreshadow });
  } catch (error) {
    console.error("更新伏笔失败:", error);
    return jsonError("更新伏笔失败", 500);
  }
}

export async function DELETE(
  _request: Request,
  { params }: ForeshadowRouteParams
) {
  try {
    const { foreshadowId } = await params;
    const deleted = await deleteForeshadow(foreshadowId);
    if (!deleted) {
      return jsonError("伏笔不存在", 404);
    }
    return jsonSuccess({ success: true });
  } catch (error) {
    console.error("删除伏笔失败:", error);
    return jsonError("删除伏笔失败", 500);
  }
}
