import { getBookOutline, upsertBookOutline } from "@/server/storage/outline-store";
import { jsonSuccess, jsonError } from "@/app/api/utils";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get("bookId") ?? "";
    const outline = await getBookOutline(bookId);
    return jsonSuccess({ outline });
  } catch (error) {
    console.error("获取总纲失败:", error);
    return jsonError("获取总纲失败");
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { bookId, direction, stages, sellingPoints } = body;
    if (!bookId || typeof bookId !== "string") {
      return jsonError("bookId是必填参数", 400);
    }
    const outline = await upsertBookOutline(bookId, {
      direction: direction ?? "",
      stages: stages ?? "",
      sellingPoints: sellingPoints ?? ""
    });
    return jsonSuccess({ outline });
  } catch (error) {
    console.error("保存总纲失败:", error);
    return jsonError("保存总纲失败");
  }
}
