import { getVolumesByBookId, createVolume } from "@/server/storage/outline-store";
import { jsonSuccess, jsonError } from "@/app/api/utils";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get("bookId") ?? "";
    const volumes = await getVolumesByBookId(bookId);
    return jsonSuccess({ volumes });
  } catch (error) {
    console.error("获取卷纲列表失败:", error);
    return jsonError("获取卷纲列表失败");
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bookId, title, coreConflict, stages, developmentArc, keyPoints, highlights } = body;
    if (!bookId) {
      return jsonError("bookId是必填参数", 400);
    }
    const volume = await createVolume(bookId, {
      title: title ?? "",
      coreConflict,
      stages,
      developmentArc,
      keyPoints,
      highlights
    });
    return jsonSuccess({ volume }, 201);
  } catch (error) {
    console.error("创建卷纲失败:", error);
    return jsonError("创建卷纲失败");
  }
}
