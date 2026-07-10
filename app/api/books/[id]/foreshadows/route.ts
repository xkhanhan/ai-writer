import { jsonSuccess, jsonError } from "@/app/api/utils";
import {
  getForeshadowsByBookId,
  createForeshadow,
} from "@/server/storage/foreshadow-store";

interface ForeshadowsRouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: Request,
  { params }: ForeshadowsRouteParams
) {
  try {
    const { id } = await params;
    const foreshadows = await getForeshadowsByBookId(id);
    return jsonSuccess({ foreshadows });
  } catch (error) {
    console.error("获取伏笔列表失败:", error);
    return jsonError("获取伏笔列表失败", 500);
  }
}

export async function POST(
  request: Request,
  { params }: ForeshadowsRouteParams
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, status, chapterId, chapterNumber, volumeId } =
      body;

    if (!name?.trim()) {
      return jsonError("伏笔名称不能为空");
    }

    const foreshadow = await createForeshadow(id, {
      name,
      description,
      status,
      chapterId,
      chapterNumber,
      volumeId,
    });
    return jsonSuccess({ foreshadow }, 201);
  } catch (error) {
    console.error("创建伏笔失败:", error);
    return jsonError("创建伏笔失败", 500);
  }
}
